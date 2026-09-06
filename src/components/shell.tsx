"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { StatusDot } from "./primitives";

export function PageHead({
  title,
  sub,
  status,
}: {
  title: string;
  sub?: string;
  status?: { label: string; tone: "ok" | "warn" | "crit" | "idle" };
}) {
  return (
    <header className="head">
      <div>
        <h1 className="title">{title}</h1>
        {sub && <p className="sub mono">{sub}</p>}
      </div>
      {status && (
        <div className="status">
          <span className="label">SYSTEM STATUS</span>
          <span className="value mono">
            <StatusDot tone={status.tone} /> {status.label}
          </span>
        </div>
      )}
      <style jsx>{`
        .head {
          display: flex; align-items: flex-start; justify-content: space-between;
          gap: 20px; flex-wrap: wrap;
          padding-bottom: 22px; margin-bottom: 26px;
          border-bottom: 1px solid var(--line);
          animation: rise 520ms var(--ease) both;
        }
        .title {
          margin: 0;
          font-size: clamp(19px, 2.6vw, 27px);
          font-weight: 500;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }
        .sub { margin: 7px 0 0; font-size: 10.5px; letter-spacing: 0.13em; color: var(--text-dim); text-transform: uppercase; }
        .status { text-align: right; display: flex; flex-direction: column; gap: 6px; }
        .value { display: inline-flex; align-items: center; gap: 8px; font-size: 11.5px; letter-spacing: 0.16em; }
      `}</style>
    </header>
  );
}

/** Real action: triggers a server sync, then refreshes server components. */
export function SyncButton({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "syncing" | "error" | "done">("idle");
  const [msg, setMsg] = useState<string | null>(null);

  async function run() {
    setState("syncing");
    setMsg(null);
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Sync failed");
      const r = data.reports?.[0];
      if (r?.status === "not_connected") {
        setState("error");
        setMsg("NOT CONNECTED");
      } else if (r?.error) {
        setState("error");
        setMsg(String(r.status).toUpperCase());
      } else {
        setState("done");
        setMsg(`${r?.repositories ?? 0} REPOS`);
      }
      router.refresh();
    } catch (e) {
      setState("error");
      setMsg((e as Error).message.slice(0, 40).toUpperCase());
    } finally {
      setTimeout(() => { setState("idle"); setMsg(null); }, 5000);
    }
  }

  return (
    <button className={`sync mono${compact ? " compact" : ""}`} onClick={run} disabled={state === "syncing"}>
      <span className={`spark ${state}`} aria-hidden="true" />
      {state === "syncing" ? "SYNCING…" : msg ?? "SYNC NOW"}
      <style jsx>{`
        .sync {
          display: inline-flex; align-items: center; gap: 9px;
          padding: ${compact ? "7px 12px" : "10px 16px"};
          font-size: 10px; letter-spacing: 0.15em;
          color: var(--text);
          border: 1px solid var(--line-strong);
          background: rgba(255,255,255,0.015);
          transition: border-color var(--fast) var(--ease), background var(--fast) var(--ease), transform var(--fast) var(--ease);
        }
        .sync:hover:not(:disabled) { border-color: var(--accent); background: rgba(77,216,232,0.07); transform: translateY(-1px); }
        .sync:disabled { opacity: 0.65; cursor: progress; }
        .spark { width: 5px; height: 5px; border-radius: 50%; background: var(--accent); box-shadow: 0 0 7px var(--accent-glow); }
        .spark.syncing { animation: pulse-ring 1.1s infinite; }
        .spark.error { background: var(--crit); box-shadow: 0 0 7px var(--crit); }
        .spark.done { background: var(--ok); box-shadow: 0 0 7px var(--ok); }
      `}</style>
    </button>
  );
}

export function EmptyState({
  headline,
  body,
  actionLabel,
  actionHref,
}: {
  headline: string;
  body: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <div className="empty">
      <div className="glyph" aria-hidden="true">◈</div>
      <h2 className="headline mono">{headline}</h2>
      <p className="body">{body}</p>
      {actionLabel && actionHref && (
        <a className="action mono" href={actionHref}>
          {actionLabel}
        </a>
      )}
      <style jsx>{`
        .empty {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          text-align: center; padding: clamp(48px, 12vh, 100px) 22px;
          border: 1px dashed var(--line-strong);
          animation: rise 560ms var(--ease) both;
        }
        .glyph { font-size: 30px; color: var(--accent); opacity: 0.75; margin-bottom: 20px; animation: drift 5s ease-in-out infinite; filter: drop-shadow(0 0 14px var(--accent-glow)); }
        .headline { font-size: 13px; letter-spacing: 0.2em; margin: 0 0 12px; text-transform: uppercase; }
        .body { max-width: 430px; margin: 0 0 24px; font-size: 13px; line-height: 1.65; color: var(--text-dim); }
        .action {
          display: inline-block; padding: 12px 24px;
          font-size: 10px; letter-spacing: 0.18em;
          border: 1px solid var(--accent); color: var(--accent);
          transition: background var(--fast) var(--ease), color var(--fast) var(--ease);
        }
        .action:hover { background: var(--accent); color: #041014; }
      `}</style>
    </div>
  );
}
