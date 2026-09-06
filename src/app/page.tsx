import Link from "next/link";
import { getAiBreakdown, getAttentionItems, getLanguageBreakdown, getOverview, getRecentActivity, getTopRepositories } from "@/lib/queries";
import { ensureProviders } from "@/lib/sync";
import { MetricGrid } from "@/components/MetricGrid";
import { EmptyState, PageHead, SyncButton } from "@/components/shell";
import { HealthRing } from "@/components/primitives";
import { timeAgo } from "@/lib/format";
import type { AttentionFlag } from "@/lib/intelligence";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  await ensureProviders();
  const overview = await getOverview();

  const github = overview.providers.find((p) => p.kind === "github");
  const connected = overview.connectedProviders > 0;

  if (!connected && !overview.hasAnyData) {
    return (
      <div className="page">
        <PageHead
          title="APP AI AGGREGATOR"
          sub="One interface for your entire AI & developer ecosystem"
          status={{ label: "NOT CONNECTED", tone: "idle" }}
        />
        <EmptyState
          headline="Connect your first source"
          body="No provider is connected yet. Add a GitHub token to start aggregating your real repositories, activity and AI projects. Nothing here is simulated — until a source is connected there is nothing to show."
          actionLabel="CONNECT GITHUB"
          actionHref="/sources"
        />
      </div>
    );
  }

  const [attention, activity, repos, ai, languages] = await Promise.all([
    getAttentionItems(6),
    getRecentActivity({ limit: 8 }),
    getTopRepositories(6),
    getAiBreakdown(),
    getLanguageBreakdown(6),
  ]);

  const m = overview.metrics;
  const errored = github && ["error", "rate_limited", "auth_required"].includes(github.status);

  return (
    <div className="page">
      <PageHead
        title="APP AI AGGREGATOR"
        sub={
          github?.accountLogin
            ? `${github.accountLogin} · LAST SYNC ${timeAgo(github.lastSyncAt)}`
            : "NO ACCOUNT RESOLVED"
        }
        status={{
          label: errored ? String(github?.status).toUpperCase().replace("_", " ") : connected ? "ONLINE" : "NOT CONNECTED",
          tone: errored ? "crit" : connected ? "ok" : "idle",
        }}
      />

      {errored && (
        <div className="banner mono" role="alert">
          GITHUB {String(github?.status).toUpperCase().replace("_", " ")} — {github?.statusDetail ?? "UNKNOWN"}
          <Link href="/sources" className="banner-link">RESOLVE</Link>
        </div>
      )}

      <div className="toolbar">
        <SyncButton />
        {github?.rateRemaining != null && (
          <span className="rate mono">
            API BUDGET {github.rateRemaining}/{github.rateLimit ?? "?"}
          </span>
        )}
      </div>

      <MetricGrid
        metrics={[
          { key: "repos", label: "Repositories", value: m.repositories, href: "/projects" },
          { key: "active", label: "Active Projects", value: m.activeProjects, href: "/projects?filter=active" },
          { key: "tools", label: "Tools", value: m.tools, href: "/projects?filter=tools" },
          { key: "sites", label: "Content Sites", value: m.contentSites, href: "/projects?filter=content" },
          { key: "ai", label: "AI Projects", value: m.aiProjects, href: "/ai" },
          { key: "activity", label: "Recent Activity", value: m.recentActivity, href: "/activity" },
          { key: "attn", label: "Needs Attention", value: m.needsAttention, href: "/attention", tone: m.needsAttention > 0 ? "warn" : "default" },
          { key: "lang", label: "Languages", value: m.languages, href: "/projects" },
        ]}
      />

      <div className="columns">
        <section className="panel" aria-labelledby="h-attn">
          <div className="panel-head">
            <h2 id="h-attn" className="label">Needs Attention</h2>
            <Link href="/attention" className="more mono">ALL</Link>
          </div>
          {attention.length === 0 ? (
            <p className="quiet mono">NO ISSUES DETECTED ACROSS SYNCED REPOSITORIES</p>
          ) : (
            <ul className="attn-list">
              {attention.map((r, i) => {
                const flags = (r.attention as unknown as AttentionFlag[]) ?? [];
                return (
                  <li key={r.id} style={{ animationDelay: `${i * 45}ms` }}>
                    <Link href={`/projects/${encodeURIComponent(r.fullName)}`} className="attn">
                      <HealthRing score={r.healthScore} size={40} />
                      <span className="attn-body">
                        <span className="attn-name">{r.name}</span>
                        <span className="flags">
                          {flags.slice(0, 3).map((f) => (
                            <span key={f.code} className={`flag mono sev-${f.severity}`}>{f.code}</span>
                          ))}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="panel" aria-labelledby="h-act">
          <div className="panel-head">
            <h2 id="h-act" className="label">Global Activity</h2>
            <Link href="/activity" className="more mono">ALL</Link>
          </div>
          {activity.length === 0 ? (
            <p className="quiet mono">NO EVENTS SYNCED YET</p>
          ) : (
            <ol className="timeline">
              {activity.map((e, i) => (
                <li key={e.id} style={{ animationDelay: `${i * 40}ms` }}>
                  <time className="t mono" dateTime={e.occurredAt.toISOString()}>
                    {e.occurredAt.toISOString().slice(11, 16)}
                  </time>
                  <span className="node" aria-hidden="true" />
                  <span className="ev">
                    <span className="ev-repo mono">{e.repository?.name ?? "—"}</span>
                    <span className="ev-title">{e.title}</span>
                  </span>
                  <span className={`ev-type mono t-${e.type}`}>{e.type.replace("_", " ")}</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <div className="columns">
        <section className="panel" aria-labelledby="h-repos">
          <div className="panel-head">
            <h2 id="h-repos" className="label">Latest Repositories</h2>
            <Link href="/projects" className="more mono">ALL</Link>
          </div>
          <ul className="repo-list">
            {repos.map((r, i) => (
              <li key={r.id} style={{ animationDelay: `${i * 45}ms` }}>
                <Link href={`/projects/${encodeURIComponent(r.fullName)}`} className="repo">
                  <HealthRing score={r.healthScore} size={38} />
                  <span className="repo-body">
                    <span className="repo-name">{r.name}</span>
                    <span className="repo-meta mono">
                      {[r.primaryLanguage ?? "NO LANGUAGE", timeAgo(r.pushedAt), r.isAiProject ? "AI" : null]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="panel" aria-labelledby="h-mix">
          <div className="panel-head">
            <h2 id="h-mix" className="label">Language Distribution</h2>
          </div>
          {languages.length === 0 ? (
            <p className="quiet mono">NO LANGUAGE DATA SYNCED</p>
          ) : (
            <ul className="bars">
              {languages.map((l, i) => (
                <li key={l.name} style={{ animationDelay: `${i * 50}ms` }}>
                  <span className="bar-top">
                    <span className="bar-name mono">{l.name}</span>
                    <span className="bar-val mono">{l.share}%</span>
                  </span>
                  <span className="track" aria-hidden="true">
                    <span className="fill" style={{ width: `${l.share}%` }} />
                  </span>
                </li>
              ))}
            </ul>
          )}

          {ai.length > 0 && (
            <>
              <div className="panel-head" style={{ marginTop: 26 }}>
                <h2 className="label">AI Categories</h2>
                <Link href="/ai" className="more mono">ALL</Link>
              </div>
              <ul className="chips">
                {ai.slice(0, 8).map((c) => (
                  <li key={c.category}>
                    <Link href={`/ai?category=${encodeURIComponent(c.category)}`} className="chip mono">
                      {c.category} <b>{c.count}</b>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
