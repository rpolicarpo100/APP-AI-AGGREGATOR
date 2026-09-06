import { prisma } from "./db";

export interface SystemOverview {
  connectedProviders: number;
  totalProviders: number;
  providers: {
    kind: string;
    status: string;
    statusDetail: string | null;
    accountLogin: string | null;
    lastSyncAt: Date | null;
    rateRemaining: number | null;
    rateLimit: number | null;
  }[];
  metrics: {
    repositories: number;
    activeProjects: number;
    aiProjects: number;
    recentActivity: number;
    needsAttention: number;
    languages: number;
  };
  hasAnyData: boolean;
}

const DAY = 86_400_000;

/** Every metric below is a live aggregate over synced real data. */
export async function getOverview(): Promise<SystemOverview> {
  const activeSince = new Date(Date.now() - 30 * DAY);
  const activitySince = new Date(Date.now() - 30 * DAY);

  const [providers, repositories, activeProjects, aiProjects, recentActivity, languages, attentionRows] =
    await Promise.all([
      prisma.provider.findMany({
        select: {
          kind: true, status: true, statusDetail: true, accountLogin: true,
          lastSyncAt: true, rateRemaining: true, rateLimit: true,
        },
        orderBy: { kind: "asc" },
      }),
      prisma.repository.count(),
      prisma.repository.count({ where: { isArchived: false, pushedAt: { gte: activeSince } } }),
      prisma.repository.count({ where: { isAiProject: true } }),
      prisma.activityEvent.count({ where: { occurredAt: { gte: activitySince } } }),
      prisma.repositoryLanguage.findMany({ distinct: ["name"], select: { name: true } }),
      prisma.repository.findMany({ where: { NOT: { attention: { equals: [] } } }, select: { id: true } }),
    ]);

  return {
    connectedProviders: providers.filter((p) => p.status === "connected").length,
    totalProviders: providers.length,
    providers,
    metrics: {
      repositories,
      activeProjects,
      aiProjects,
      recentActivity,
      needsAttention: attentionRows.length,
      languages: languages.length,
    },
    hasAnyData: repositories > 0,
  };
}

export async function getAttentionItems(limit = 12) {
  const repos = await prisma.repository.findMany({
    where: { NOT: { attention: { equals: [] } } },
    select: {
      id: true, name: true, fullName: true, url: true, attention: true,
      healthScore: true, ciStatus: true, pushedAt: true,
    },
    orderBy: [{ healthScore: "asc" }, { pushedAt: "desc" }],
    take: limit,
  });
  return repos;
}

export async function getRecentActivity(opts: { type?: string; limit?: number } = {}) {
  const { type, limit = 30 } = opts;
  return prisma.activityEvent.findMany({
    where: type && type !== "all" ? { type } : undefined,
    orderBy: { occurredAt: "desc" },
    take: limit,
    select: {
      id: true, type: true, action: true, title: true, url: true,
      occurredAt: true, state: true,
      repository: { select: { name: true, fullName: true } },
    },
  });
}

export async function getTopRepositories(limit = 8) {
  return prisma.repository.findMany({
    orderBy: { pushedAt: "desc" },
    take: limit,
    select: {
      id: true, name: true, fullName: true, description: true, url: true,
      primaryLanguage: true, healthScore: true, ciStatus: true, pushedAt: true,
      isAiProject: true, aiCategories: true, stars: true, openIssues: true,
      openPullRequests: true, isArchived: true,
    },
  });
}

export async function getAiBreakdown() {
  const repos = await prisma.repository.findMany({
    where: { isAiProject: true },
    select: { aiCategories: true },
  });
  const counts = new Map<string, number>();
  for (const r of repos) for (const c of r.aiCategories) counts.set(c, (counts.get(c) ?? 0) + 1);
  return [...counts.entries()].map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count);
}

export async function getLanguageBreakdown(limit = 8) {
  const rows = await prisma.repositoryLanguage.groupBy({
    by: ["name"],
    _sum: { bytes: true },
    orderBy: { _sum: { bytes: "desc" } },
    take: limit,
  });
  const total = rows.reduce((a, r) => a + (r._sum.bytes ?? 0), 0);
  return rows.map((r) => ({
    name: r.name,
    bytes: r._sum.bytes ?? 0,
    share: total ? Math.round(((r._sum.bytes ?? 0) / total) * 100) : 0,
  }));
}

/** Payload for the command palette / universal search index. */
export async function getSearchIndex() {
  const [repos, langs] = await Promise.all([
    prisma.repository.findMany({
      select: {
        id: true, name: true, fullName: true, description: true, url: true,
        primaryLanguage: true, isAiProject: true, aiCategories: true, topics: true,
        healthScore: true, ciStatus: true, isArchived: true, pushedAt: true,
        openIssues: true, openPullRequests: true,
      },
      orderBy: { pushedAt: "desc" },
    }),
    prisma.repositoryLanguage.groupBy({ by: ["name"], _count: { name: true } }),
  ]);
  return { repos, languages: langs.map((l) => ({ name: l.name, count: l._count.name })) };
}
