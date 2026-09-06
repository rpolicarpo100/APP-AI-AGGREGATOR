import Link from "next/link";
import { getAttentionItems, getOverview } from "@/lib/queries";
import { EmptyState, PageHead, SyncButton } from "@/components/shell";
import { HealthRing, timeAgo } from "@/components/primitives";
import type { AttentionFlag } from "@/lib/intelligence";

export const dynamic = "force-dynamic";

export default async function AttentionPage() {
  const overview = await getOverview();

  if (!overview.hasAnyData) {
    return (
      <div className="page">
        <PageHead title="Attention Center" sub="Derived from real repository state" status={{ label: "NO DATA", tone: "idle" }} />
        <EmptyState
          headline="Nothing to monitor yet"
          body="Once repositories are synced, this view surfaces failing CI, stale projects, open pull requests and issue backlogs — all derived from real data."
          actionLabel="CONNECT GITHUB"
          actionHref="/sources"
        />
      </div>
    );
  }

  const items = await getAttentionItems(100);

  if (items.length === 0) {
    return (
      <div className="page">
        <PageHead title="Attention Center" sub="Derived from real repository state" status={{ label: "ALL CLEAR", tone: "ok" }} />
        <EmptyState
          headline="All systems nominal"
          body="No synced repository currently reports a failing build, stale timeline, pull request backlog or issue overload."
          actionLabel="VIEW ALL PROJECTS"
          actionHref="/projects"
        />
      </div>
    );
  }

  const critical = items.filter((r) => ((r.attention as unknown as AttentionFlag[]) ?? []).some((f) => f.severity === "critical"));

  return (
    <div className="page">
      <PageHead
        title="Attention Center"
        sub={`${items.length} PROJECTS FLAGGED · ${critical.length} CRITICAL`}
        status={{ label: critical.length > 0 ? "ACTION REQUIRED" : "REVIEW", tone: critical.length > 0 ? "crit" : "warn" }}
      />
      <div className="toolbar"><SyncButton compact /></div>

      <ul className="attn-rows">
        {items.map((r, i) => {
          const flags = (r.attention as unknown as AttentionFlag[]) ?? [];
          return (
            <li key={r.id} style={{ animationDelay: `${Math.min(i, 16) * 40}ms` }}>
              <Link href={`/projects/${encodeURIComponent(r.fullName)}`} className="attn-row">
                <HealthRing score={r.healthScore} size={48} />
                <div className="ar-body">
                  <h3 className="ar-name">{r.name}</h3>
                  <span className="ar-meta mono">{r.fullName} · {timeAgo(r.pushedAt)}</span>
                </div>
                <div className="ar-flags">
                  {flags.map((f) => (
                    <span key={f.code} className={`flag mono sev-${f.severity}`} title={f.detail}>
                      {f.code}
                    </span>
                  ))}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
