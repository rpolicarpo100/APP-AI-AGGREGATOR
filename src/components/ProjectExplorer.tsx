"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { HealthRing, timeAgo } from "./primitives";

export type ProjectRow = {
  id: string;
  name: string;
  fullName: string;
  description: string | null;
  url: string;
  primaryLanguage: string | null;
  healthScore: number | null;
  ciStatus: string | null;
  pushedAt: string | null;
  isAiProject: boolean;
  aiCategories: string[];
  stars: number;
  openIssues: number;
  openPullRequests: number;
  isArchived: boolean;
  projectType: string;
  projectSubtype: string | null;
};

const DAY = 86_400_000;

type Filter = "all" | "tools" | "content" | "active" | "inactive" | "failing" | "ai" | "archived";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "tools", label: "Tools" },
  { id: "content", label: "Sites" },
  { id: "active", label: "Active" },
  { id: "ai", label: "AI" },
  { id: "failing", label: "Failing CI" },
  { id: "inactive", label: "Inactive" },
  { id: "archived", label: "Archived" },
];

/**
 * Client-side explorer: the full set is already on the client, so filtering
 * and sorting are instant and cost no network requests.
 */
export function ProjectExplorer({
  rows,
  initialFilter = "all",
  initialLanguage = null,
  languages,
}: {
  rows: ProjectRow[];
  initialFilter?: Filter;
  initialLanguage?: string | null;
  languages: string[];
}) {
  const [filter, setFilter] = useState<Filter>(initialFilter);
  const [language, setLanguage] = useState<string | null>(initialLanguage);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"recent" | "health" | "name">("recent");

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let out = rows.filter((r) => {
      const idle = r.pushedAt ? (Date.now() - new Date(r.pushedAt).getTime()) / DAY : Infinity;
      if (filter === "tools" && !["TOOL", "LIBRARY"].includes(r.projectType)) return false;
      if (filter === "content" && r.projectType !== "CONTENT") return false;
      if (filter === "active" && (r.isArchived || idle > 30)) return false;
      if (filter === "inactive" && idle < 180) return false;
      if (filter === "failing" && r.ciStatus !== "failure") return false;
      if (filter === "ai" && !r.isAiProject) return false;
      if (filter === "archived" && !r.isArchived) return false;
      if (language && r.primaryLanguage !== language) return false;
      if (needle) {
        const hay = `${r.name} ${r.fullName} ${r.description ?? ""} ${r.primaryLanguage ?? ""} ${r.aiCategories.join(" ")} ${r.projectType} ${r.projectSubtype ?? ""}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });

    out = [...out].sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "health") return (b.healthScore ?? -1) - (a.healthScore ?? -1);
      return new Date(b.pushedAt ?? 0).getTime() - new Date(a.pushedAt ?? 0).getTime();
    });
    return out;
  }, [rows, filter, language, q, sort]);

  return (
    <>
      <div className="controls">
        <label className="search">
          <span className="sr-only">Filter projects</span>
          <span className="s-caret mono" aria-hidden="true">/</span>
          <input
            className="s-input mono"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="FILTER BY NAME, DESCRIPTION, TECHNOLOGY"
          />
        </label>

        <label className="sortwrap">
          <span className="sr-only">Sort projects</span>
          <select className="sort mono" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
            <option value="recent">SORT: RECENT</option>
            <option value="health">SORT: HEALTH</option>
            <option value="name">SORT: NAME</option>
          </select>
        </label>
      </div>

      <div className="filterbar" role="group" aria-label="Filters">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            className={`chip mono${filter === f.id ? " is-on" : ""}`}
            aria-pressed={filter === f.id}
            onClick={() => setFilter(f.id)}
          >
            {f.label.toUpperCase()}
          </button>
        ))}
        {languages.length > 0 && (
          <label className="sortwrap">
            <span className="sr-only">Filter by language</span>
            <select
              className="sort mono"
              value={language ?? ""}
              onChange={(e) => setLanguage(e.target.value || null)}
            >
              <option value="">ALL LANGUAGES</option>
              {languages.map((l) => (
                <option key={l} value={l}>{l.toUpperCase()}</option>
              ))}
            </select>
          </label>
        )}
        <span className="count mono">{visible.length} / {rows.length}</span>
      </div>

      {visible.length === 0 ? (
        <p className="quiet mono">NO PROJECTS MATCH THE CURRENT FILTERS</p>
      ) : (
        <ul className="cards">
          {visible.map((r, i) => (
            <li key={r.id} style={{ animationDelay: `${Math.min(i, 14) * 40}ms` }}>
              <Link href={`/projects/${encodeURIComponent(r.fullName)}`} className="card">
                <div className="card-top">
                  <HealthRing score={r.healthScore} size={46} />
                  <div className="card-id">
                    <h3 className="card-name">{r.name}</h3>
                    <span className="card-owner mono">{r.fullName.split("/")[0]}</span>
                  </div>
                  <span className="tagstack">
                    {r.isAiProject && <span className="ai-tag mono">AI</span>}
                    {r.projectType !== "UNKNOWN" && (
                      <span className={`type-tag mono ty-${r.projectType.toLowerCase()}`}>
                        {r.projectSubtype ?? r.projectType}
                      </span>
                    )}
                  </span>
                </div>

                <p className="card-desc">{r.description ?? "No description provided."}</p>

                <div className="card-foot mono">
                  <span>{r.primaryLanguage ?? "—"}</span>
                  <span className={`ci ci-${r.ciStatus ?? "none"}`}>
                    {r.ciStatus ? r.ciStatus.toUpperCase() : "NO CI"}
                  </span>
                  <span>{timeAgo(r.pushedAt)}</span>
                </div>

                {r.aiCategories.length > 0 && (
                  <div className="cats">
                    {r.aiCategories.slice(0, 3).map((c) => (
                      <span key={c} className="cat mono">{c}</span>
                    ))}
                  </div>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
