"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Repo = {
  id: string; name: string; fullName: string; description: string | null; url: string;
  primaryLanguage: string | null; isAiProject: boolean; aiCategories: string[]; topics: string[];
  healthScore: number | null; ciStatus: string | null; isArchived: boolean;
  pushedAt: string | null; openIssues: number; openPullRequests: number;
};

type Item = {
  id: string;
  kind: "command" | "repository" | "language";
  title: string;
  detail: string;
  hint: string;
  run: () => void;
  score?: number;
};

const DAY = 86_400_000;

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const [index, setIndex] = useState<{ repos: Repo[]; languages: { name: string; count: number }[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const loadIndex = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/search");
      if (res.ok) setIndex(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setCursor(0);
      if (!index) void loadIndex();
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open, index, loadIndex]);

  const runSync = useCallback(async () => {
    setSyncing(true);
    setNotice("SYNCING GITHUB…");
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "sync failed");
      const r = data.reports?.[0];
      setNotice(
        r?.status === "not_connected"
          ? "GITHUB NOT CONNECTED — ADD A TOKEN IN SOURCES"
          : `SYNCED ${r?.repositories ?? 0} REPOSITORIES`,
      );
      await loadIndex();
      router.refresh();
    } catch (e) {
      setNotice(`ERROR — ${(e as Error).message}`);
    } finally {
      setSyncing(false);
      setTimeout(() => setNotice(null), 4000);
    }
  }, [loadIndex, router]);

  const go = useCallback(
    (href: string) => {
      setOpen(false);
      router.push(href);
    },
    [router],
  );

  const items = useMemo<Item[]>(() => {
    const q = query.trim().toLowerCase();
    const commands: Item[] = [
      { id: "c-overview", kind: "command", title: "Show overview", detail: "System dashboard", hint: "GO", run: () => go("/") },
      { id: "c-projects", kind: "command", title: "Search repositories", detail: "All aggregated projects", hint: "GO", run: () => go("/projects") },
      { id: "c-active", kind: "command", title: "Show active projects", detail: "Pushed in the last 30 days", hint: "GO", run: () => go("/projects?filter=active") },
      { id: "c-ai", kind: "command", title: "Show AI projects", detail: "Classified from real signals", hint: "GO", run: () => go("/ai") },
      { id: "c-attn", kind: "command", title: "Show projects needing attention", detail: "CI, staleness, backlog", hint: "GO", run: () => go("/attention") },
      { id: "c-failing", kind: "command", title: "Show failing builds", detail: "CI failure only", hint: "GO", run: () => go("/projects?filter=failing") },
      { id: "c-inactive", kind: "command", title: "Show inactive projects", detail: "No push in 180+ days", hint: "GO", run: () => go("/projects?filter=inactive") },
      { id: "c-activity", kind: "command", title: "View recent activity", detail: "Global event timeline", hint: "GO", run: () => go("/activity") },
      { id: "c-sources", kind: "command", title: "Manage sources", detail: "Provider connections", hint: "GO", run: () => go("/sources") },
      {
        id: "c-sync",
        kind: "command",
        title: "Refresh GitHub data",
        detail: syncing ? "Sync in progress" : "Pull latest from the API",
        hint: "RUN",
        run: () => void runSync(),
      },
    ];

    const repos: Item[] = (index?.repos ?? []).map((r) => {
      const idle = r.pushedAt ? Math.floor((Date.now() - new Date(r.pushedAt).getTime()) / DAY) : null;
      const bits = [
        r.primaryLanguage ?? "NO LANGUAGE",
        r.healthScore != null ? `HEALTH ${r.healthScore}` : null,
        idle != null ? `${idle}D` : null,
      ].filter(Boolean);
      return {
        id: `r-${r.id}`,
        kind: "repository" as const,
        title: r.name,
        detail: bits.join(" · "),
        hint: r.isAiProject ? "AI" : "REPO",
        run: () => go(`/projects/${encodeURIComponent(r.fullName)}`),
      };
    });

    const languages: Item[] = (index?.languages ?? []).map((l) => ({
      id: `l-${l.name}`,
      kind: "language" as const,
      title: l.name,
      detail: `${l.count} repositor${l.count === 1 ? "y" : "ies"}`,
      hint: "LANG",
      run: () => go(`/projects?language=${encodeURIComponent(l.name)}`),
    }));

    const all = [...commands, ...repos, ...languages];
    if (!q) return all.slice(0, 40);

    const scored = all
      .map((it) => {
        const hay = `${it.title} ${it.detail} ${it.kind}`.toLowerCase();
        const raw = index?.repos.find((r) => `r-${r.id}` === it.id);
        const extra = raw
          ? `${raw.fullName} ${raw.description ?? ""} ${raw.topics.join(" ")} ${raw.aiCategories.join(" ")}`.toLowerCase()
          : "";
        const target = `${hay} ${extra}`;
        if (!target.includes(q)) return null;
        let score = 0;
        if (it.title.toLowerCase().startsWith(q)) score += 100;
        else if (it.title.toLowerCase().includes(q)) score += 60;
        if (it.kind === "command") score += 25;
        score += Math.max(0, 30 - target.indexOf(q) / 4);
        return { ...it, score };
      })
      .filter(Boolean) as Item[];

    return scored.sort((a, b) => (b.score ?? 0) - (a.score ?? 0)).slice(0, 40);
  }, [query, index, go, runSync, syncing]);

  useEffect(() => setCursor(0), [query]);

  useEffect(() => {
    const el = listRef.current?.children[cursor] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [cursor]);

  if (!open) return null;

  return (
    <div className="scrim" onMouseDown={() => setOpen(false)}>
      <div
        className="palette"
        role="dialog"
        aria-modal="true"
        aria-label="Command center"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="bar">
          <span className="caret mono" aria-hidden="true">&gt;</span>
          <input
            ref={inputRef}
            className="input mono"
            value={query}
            placeholder="Search repositories, languages, commands"
            aria-label="Command input"
            aria-controls="cmd-results"
            aria-activedescendant={items[cursor] ? `opt-${items[cursor].id}` : undefined}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setCursor((c) => Math.min(c + 1, items.length - 1)); }
              if (e.key === "ArrowUp") { e.preventDefault(); setCursor((c) => Math.max(c - 1, 0)); }
              if (e.key === "Enter") { e.preventDefault(); items[cursor]?.run(); }
            }}
          />
          <span className="esc mono" aria-hidden="true">ESC</span>
        </div>

        {notice && <div className="notice mono" role="status">{notice}</div>}

        <ul id="cmd-results" ref={listRef} className="results" role="listbox" aria-label="Results">
          {loading && !index && <li className="state mono">LOADING INDEX…</li>}
          {!loading && items.length === 0 && (
            <li className="state mono">NO MATCH FOR “{query.toUpperCase()}”</li>
          )}
          {items.map((it, i) => (
            <li
              key={it.id}
              id={`opt-${it.id}`}
              role="option"
              aria-selected={i === cursor}
              className={`row${i === cursor ? " is-cursor" : ""}`}
              onMouseEnter={() => setCursor(i)}
              onClick={() => it.run()}
            >
              <span className={`kind mono k-${it.kind}`}>{it.hint}</span>
              <span className="title">{it.title}</span>
              <span className="detail mono">{it.detail}</span>
            </li>
          ))}
        </ul>

        <footer className="foot mono">
          <span>↑↓ NAVIGATE</span>
          <span>↵ SELECT</span>
          <span>ESC CLOSE</span>
        </footer>
      </div>

      <style jsx>{`
        .scrim {
          position: fixed; inset: 0; z-index: 120;
          background: rgba(3, 5, 8, 0.72);
          backdrop-filter: blur(5px);
          display: flex; align-items: flex-start; justify-content: center;
          padding: clamp(50px, 12vh, 130px) 16px 16px;
          animation: fade 140ms var(--ease) both;
        }
        .palette {
          width: min(680px, 100%);
          background: linear-gradient(180deg, #0c1119, #080b11);
          border: 1px solid var(--line-strong);
          box-shadow: 0 40px 100px rgba(0,0,0,0.7), 0 0 0 1px rgba(77,216,232,0.06);
          display: flex; flex-direction: column;
          max-height: min(560px, 74vh);
          animation: rise 300ms var(--ease) both;
        }
        .bar {
          display: flex; align-items: center; gap: 11px;
          padding: 16px 18px;
          border-bottom: 1px solid var(--line);
        }
        .caret { color: var(--accent); font-size: 14px; }
        .input {
          flex: 1; background: none; border: none; color: var(--text);
          font-size: 14px; letter-spacing: 0.01em;
        }
        .input::placeholder { color: var(--text-dim); }
        .esc { font-size: 9px; color: var(--text-dim); border: 1px solid var(--line-strong); padding: 3px 6px; }

        .notice {
          padding: 9px 18px; font-size: 10px; letter-spacing: 0.14em;
          color: var(--accent); border-bottom: 1px solid var(--line);
          background: rgba(77,216,232,0.05);
        }

        .results { list-style: none; margin: 0; padding: 6px; overflow-y: auto; flex: 1; }
        .state { padding: 26px 14px; font-size: 10.5px; letter-spacing: 0.14em; color: var(--text-dim); text-align: center; }

        .row {
          display: grid;
          grid-template-columns: 46px 1fr auto;
          align-items: center; gap: 12px;
          padding: 10px 12px;
          cursor: pointer;
          border-left: 2px solid transparent;
        }
        .row.is-cursor { background: rgba(77,216,232,0.07); border-left-color: var(--accent); }
        .kind {
          font-size: 8.5px; letter-spacing: 0.12em; text-align: center;
          padding: 3px 0; color: var(--text-dim); border: 1px solid var(--line-strong);
        }
        .k-command { color: var(--signal); border-color: rgba(124,140,255,0.3); }
        .k-repository { color: var(--accent); border-color: rgba(77,216,232,0.28); }
        .title { font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .detail { font-size: 9.5px; color: var(--text-dim); letter-spacing: 0.07em; text-transform: uppercase; white-space: nowrap; }

        .foot {
          display: flex; gap: 18px; padding: 9px 18px;
          border-top: 1px solid var(--line);
          font-size: 9px; letter-spacing: 0.13em; color: var(--text-dim);
        }
        @media (max-width: 560px) {
          .row { grid-template-columns: 40px 1fr; }
          .detail { display: none; }
          .foot { display: none; }
        }
      `}</style>
    </div>
  );
}
