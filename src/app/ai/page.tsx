import Link from "next/link";
import { prisma } from "@/lib/db";
import { getAiBreakdown, getOverview } from "@/lib/queries";
import { EmptyState, PageHead } from "@/components/shell";
import { HealthRing } from "@/components/primitives";
import { timeAgo } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AiPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const sp = await searchParams;
  const overview = await getOverview();
  const category = sp.category ?? null;

  if (!overview.hasAnyData) {
    return (
      <div className="page">
        <PageHead title="AI Projects" sub="Classified from real signals" status={{ label: "NO DATA", tone: "idle" }} />
        <EmptyState
          headline="No repositories aggregated"
          body="AI classification runs on real dependencies, topics and README content. Connect a provider and sync to populate this view."
          actionLabel="CONNECT GITHUB"
          actionHref="/sources"
        />
      </div>
    );
  }

  const [breakdown, repos] = await Promise.all([
    getAiBreakdown(),
    prisma.repository.findMany({
      where: { isAiProject: true, ...(category ? { aiCategories: { has: category } } : {}) },
      orderBy: [{ aiConfidence: "desc" }, { pushedAt: "desc" }],
      select: {
        id: true, name: true, fullName: true, description: true, primaryLanguage: true,
        healthScore: true, pushedAt: true, aiCategories: true, aiSignals: true, aiConfidence: true,
      },
    }),
  ]);

  if (repos.length === 0 && !category) {
    return (
      <div className="page">
        <PageHead title="AI Projects" sub="Classified from real signals" status={{ label: "ONLINE", tone: "ok" }} />
        <EmptyState
          headline="No AI projects detected"
          body="None of your synced repositories matched the AI classifier. Detection uses real dependencies (openai, torch, langgraph…), repository topics and README content — nothing is assumed."
          actionLabel="VIEW ALL PROJECTS"
          actionHref="/projects"
        />
      </div>
    );
  }

  return (
    <div className="page">
      <PageHead
        title="AI Projects"
        sub={`${repos.length} DETECTED FROM DEPENDENCIES, TOPICS AND README`}
        status={{ label: "ONLINE", tone: "ok" }}
      />

      <div className="filterbar">
        <Link href="/ai" className={`chip mono${!category ? " is-on" : ""}`}>ALL <b>{overview.metrics.aiProjects}</b></Link>
        {breakdown.map((c) => (
          <Link
            key={c.category}
            href={`/ai?category=${encodeURIComponent(c.category)}`}
            className={`chip mono${category === c.category ? " is-on" : ""}`}
          >
            {c.category} <b>{c.count}</b>
          </Link>
        ))}
      </div>

      {repos.length === 0 ? (
        <p className="quiet mono">NO PROJECTS IN CATEGORY “{category?.toUpperCase()}”</p>
      ) : (
        <ul className="cards">
          {repos.map((r, i) => (
            <li key={r.id} style={{ animationDelay: `${Math.min(i, 14) * 40}ms` }}>
              <Link href={`/projects/${encodeURIComponent(r.fullName)}`} className="card">
                <div className="card-top">
                  <HealthRing score={r.healthScore} size={46} />
                  <div className="card-id">
                    <h3 className="card-name">{r.name}</h3>
                    <span className="card-owner mono">CONFIDENCE {r.aiConfidence}%</span>
                  </div>
                </div>
                <p className="card-desc">{r.description ?? "No description provided."}</p>
                <div className="cats">
                  {r.aiCategories.map((c) => (
                    <span key={c} className="cat mono">{c}</span>
                  ))}
                </div>
                <div className="card-foot mono">
                  <span>{r.primaryLanguage ?? "—"}</span>
                  <span>{timeAgo(r.pushedAt)}</span>
                </div>
                <div className="signals mono">
                  {r.aiSignals.slice(0, 4).map((s) => (
                    <span key={s} className="signal">{s}</span>
                  ))}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
