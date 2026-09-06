import { prisma } from "@/lib/db";
import { getOverview } from "@/lib/queries";
import { EmptyState, PageHead, SyncButton } from "@/components/shell";
import { ProjectExplorer, type ProjectRow } from "@/components/ProjectExplorer";

export const dynamic = "force-dynamic";

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; language?: string }>;
}) {
  const sp = await searchParams;
  const overview = await getOverview();

  if (!overview.hasAnyData) {
    return (
      <div className="page">
        <PageHead title="Projects" sub="Aggregated repositories" status={{ label: "NO DATA", tone: "idle" }} />
        <EmptyState
          headline="No repositories aggregated"
          body="Connect a provider and run a sync to populate this view with your real repositories."
          actionLabel="CONNECT GITHUB"
          actionHref="/sources"
        />
      </div>
    );
  }

  const repos = await prisma.repository.findMany({
    orderBy: { pushedAt: "desc" },
    select: {
      id: true, name: true, fullName: true, description: true, url: true,
      primaryLanguage: true, healthScore: true, ciStatus: true, pushedAt: true,
      isAiProject: true, aiCategories: true, stars: true, openIssues: true,
      openPullRequests: true, isArchived: true,
    },
  });

  const rows: ProjectRow[] = repos.map((r) => ({ ...r, pushedAt: r.pushedAt?.toISOString() ?? null }));
  const languages = [...new Set(repos.map((r) => r.primaryLanguage).filter(Boolean) as string[])].sort();

  const allowed = ["all", "active", "inactive", "failing", "ai", "archived"] as const;
  const filter = (allowed as readonly string[]).includes(sp.filter ?? "") ? (sp.filter as any) : "all";

  return (
    <div className="page">
      <PageHead
        title="Projects"
        sub={`${rows.length} REPOSITORIES AGGREGATED`}
        status={{ label: "ONLINE", tone: "ok" }}
      />
      <div className="toolbar"><SyncButton compact /></div>
      <ProjectExplorer
        rows={rows}
        initialFilter={filter}
        initialLanguage={sp.language ?? null}
        languages={languages}
      />
    </div>
  );
}
