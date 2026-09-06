"use client";

import { useEffect, useState, useTransition } from "react";

export type Ev = {
  id: string;
  type: string;
  action: string | null;
  title: string;
  url: string | null;
  state: string | null;
  occurredAt: string;
  repoName: string | null;
};

const TABS = [
  { id: "all", label: "All" },
  { id: "commit", label: "Commits" },
  { id: "issue", label: "Issues" },
  { id: "pull_request", label: "Pull Requests" },
  { id: "release", label: "Releases" },
  { id: "workflow", label: "Workflows" },
];

export function ActivityStream({ initial }: { initial: Ev[] }) {
  const [tab, setTab] = useState("all");
  const [events, setEvents] = useState(initial);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (tab === "all") {
      setEvents(initial);
      setError(null);
      return;
    }
    let cancelled = false;
    start(() => {});
    fetch(`/api/activity?type=${tab}&limit=100`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (d.error) setError(d.error);
        else {
          setError(null);
          setEvents(
            d.events.map((e: any) => ({
              id: e.id, type: e.type, action: e.action, title: e.title,
              url: e.url, state: e.state, occurredAt: e.occurredAt,
              repoName: e.repository?.name ?? null,
            })),
          );
        }
      })
      .catch((e) => !cancelled && setError(e.message));
    return () => { cancelled = true; };
  }, [tab, initial]);

  const groups = groupByDay(events);

  return (
    <>
      <div className="filterbar" role="group" aria-label="Event type filters">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`chip mono${tab === t.id ? " is-on" : ""}`}
            aria-pressed={tab === t.id}
            onClick={() => setTab(t.id)}
          >
            {t.label.toUpperCase()}
          </button>
        ))}
        <span className="count mono">{pending ? "LOADING…" : `${events.length} EVENTS`}</span>
      </div>

      {error && <p className="quiet mono" role="alert">ERROR — {error.toUpperCase()}</p>}

      {!error && events.length === 0 && <p className="quiet mono">NO EVENTS OF THIS TYPE</p>}

      {groups.map(([day, list]) => (
        <section key={day} className="day">
          <h2 className="day-label mono">{day}</h2>
          <ol className="timeline">
            {list.map((e, i) => {
              const body = (
                <>
                  <time className="t mono" dateTime={e.occurredAt}>
                    {new Date(e.occurredAt).toISOString().slice(11, 16)}
                  </time>
                  <span className="node" aria-hidden="true" />
                  <span className="ev">
                    <span className="ev-repo mono">{e.repoName ?? "—"}</span>
                    <span className="ev-title">{e.title}</span>
                  </span>
                  <span className={`ev-type mono t-${e.type}`}>
                    {(e.action ? `${e.type} ${e.action}` : e.type).replace(/_/g, " ")}
                  </span>
                </>
              );
              return (
                <li key={e.id} style={{ animationDelay: `${Math.min(i, 16) * 35}ms` }}>
                  {e.url ? (
                    <a className="ev-link" href={e.url} target="_blank" rel="noopener noreferrer">{body}</a>
                  ) : (
                    body
                  )}
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </>
  );
}

function groupByDay(events: Ev[]): [string, Ev[]][] {
  const map = new Map<string, Ev[]>();
  for (const e of events) {
    const key = new Date(e.occurredAt).toISOString().slice(0, 10);
    const arr = map.get(key) ?? [];
    arr.push(e);
    map.set(key, arr);
  }
  return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
}
