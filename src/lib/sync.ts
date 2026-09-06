import { prisma } from "./db";
import { GitHubAdapter } from "./providers/github";
import { ProviderError, type ProviderAdapter } from "./providers/types";
import { classifyAi, classifyProjectType, computeAttention, computeHealth } from "./intelligence";

export function getAdapters(): ProviderAdapter[] {
  return [new GitHubAdapter()];
}

/** Provider rows always reflect reality: configured or NOT CONNECTED. */
export async function ensureProviders() {
  for (const adapter of getAdapters()) {
    const existing = await prisma.provider.findUnique({ where: { kind: adapter.kind } });
    if (!existing) {
      await prisma.provider.create({
        data: { kind: adapter.kind, status: adapter.isConfigured() ? "connected" : "not_connected" },
      });
    } else if (!adapter.isConfigured() && existing.status !== "not_connected") {
      await prisma.provider.update({
        where: { id: existing.id },
        data: { status: "not_connected", statusDetail: "No credentials configured" },
      });
    }
  }
}

export interface SyncReport {
  provider: string;
  status: string;
  repositories: number;
  events: number;
  detailsSynced: number;
  error?: string;
}

/**
 * Full sync for one provider. Detail fetching is throttled and incremental:
 * only repos whose remote push timestamp moved since detailSyncedAt are refetched.
 */
export async function syncProvider(adapter: ProviderAdapter, opts: { detailLimit?: number } = {}): Promise<SyncReport> {
  const detailLimit = opts.detailLimit ?? 40;
  await ensureProviders();
  const row = await prisma.provider.findUnique({ where: { kind: adapter.kind } });
  if (!row) throw new Error(`Provider row missing for ${adapter.kind}`);

  if (!adapter.isConfigured()) {
    return { provider: adapter.kind, status: "not_connected", repositories: 0, events: 0, detailsSynced: 0 };
  }

  await prisma.provider.update({ where: { id: row.id }, data: { syncState: "syncing" } });

  try {
    const account = await adapter.getAccount();
    const repos = await adapter.listRepositories();

    const seen: string[] = [];
    for (const r of repos) {
      const saved = await prisma.repository.upsert({
        where: { providerId_externalId: { providerId: row.id, externalId: r.externalId } },
        create: {
          providerId: row.id,
          externalId: r.externalId,
          name: r.name,
          fullName: r.fullName,
          description: r.description,
          url: r.url,
          homepage: r.homepage,
          isPrivate: r.isPrivate,
          isFork: r.isFork,
          isArchived: r.isArchived,
          defaultBranch: r.defaultBranch,
          primaryLanguage: r.primaryLanguage,
          stars: r.stars,
          forks: r.forks,
          watchers: r.watchers,
          openIssues: r.openIssues,
          sizeKb: r.sizeKb,
          topics: r.topics,
          pushedAt: r.pushedAt,
          createdAtRemote: r.createdAtRemote,
          updatedAtRemote: r.updatedAtRemote,
          hasPages: r.hasPages,
        },
        update: {
          name: r.name,
          fullName: r.fullName,
          description: r.description,
          url: r.url,
          homepage: r.homepage,
          isPrivate: r.isPrivate,
          isFork: r.isFork,
          isArchived: r.isArchived,
          defaultBranch: r.defaultBranch,
          primaryLanguage: r.primaryLanguage,
          stars: r.stars,
          forks: r.forks,
          watchers: r.watchers,
          openIssues: r.openIssues,
          sizeKb: r.sizeKb,
          topics: r.topics,
          pushedAt: r.pushedAt,
          updatedAtRemote: r.updatedAtRemote,
          hasPages: r.hasPages,
        },
      });
      seen.push(saved.id);
    }

    // Remove repositories that no longer exist remotely (deleted / access revoked).
    await prisma.repository.deleteMany({ where: { providerId: row.id, id: { notIn: seen } } });

    // Incremental detail sync: stalest-first, bounded per run.
    const candidates = await prisma.repository.findMany({
      where: { providerId: row.id },
      orderBy: [{ detailSyncedAt: { sort: "asc", nulls: "first" } }, { pushedAt: "desc" }],
      take: detailLimit,
    });

    let detailsSynced = 0;
    for (const repo of candidates) {
      const fresh =
        repo.detailSyncedAt && repo.pushedAt && repo.detailSyncedAt > repo.pushedAt &&
        Date.now() - repo.detailSyncedAt.getTime() < 6 * 3600_000;
      if (fresh) continue;

      try {
        const detail = await adapter.getRepositoryDetail(repo.fullName, repo.defaultBranch);
        const normalized = {
          externalId: repo.externalId,
          name: repo.name,
          fullName: repo.fullName,
          description: repo.description,
          url: repo.url,
          homepage: repo.homepage,
          isPrivate: repo.isPrivate,
          isFork: repo.isFork,
          isArchived: repo.isArchived,
          defaultBranch: repo.defaultBranch,
          primaryLanguage: repo.primaryLanguage,
          stars: repo.stars,
          forks: repo.forks,
          watchers: repo.watchers,
          openIssues: repo.openIssues,
          sizeKb: repo.sizeKb,
          topics: repo.topics,
          pushedAt: repo.pushedAt,
          createdAtRemote: repo.createdAtRemote,
          updatedAtRemote: repo.updatedAtRemote,
          hasPages: false,
        };

        const ai = classifyAi(normalized, detail);
        const ptype = classifyProjectType({
          name: repo.name,
          description: repo.description,
          topics: repo.topics,
          primaryLanguage: repo.primaryLanguage,
          dependencies: detail.dependencies,
          fileNames: detail.fileNames,
          sizeKb: repo.sizeKb,
          hasPages: repo.hasPages,
          languages: detail.languages,
        });
        const healthInput = {
          pushedAt: repo.pushedAt,
          isArchived: repo.isArchived,
          ciStatus: detail.ciStatus,
          openIssues: repo.openIssues,
          openPullRequests: detail.openPullRequests,
          hasReadme: !!detail.readme,
          hasDocs: detail.hasDocs,
        };
        const health = computeHealth(healthInput);
        const attention = computeAttention(healthInput);

        await prisma.$transaction([
          prisma.repositoryLanguage.deleteMany({ where: { repositoryId: repo.id } }),
          prisma.repositoryLanguage.createMany({
            data: detail.languages.map((l) => ({ repositoryId: repo.id, name: l.name, bytes: l.bytes })),
            skipDuplicates: true,
          }),
          prisma.dependency.deleteMany({ where: { repositoryId: repo.id } }),
          prisma.dependency.createMany({
            data: dedupeDeps(detail.dependencies).map((d) => ({
              repositoryId: repo.id,
              name: d.name,
              version: d.version,
              ecosystem: d.ecosystem,
              isAiRelated: ai.signals.includes(`dependency:${d.name}`),
            })),
            skipDuplicates: true,
          }),
          prisma.repository.update({
            where: { id: repo.id },
            data: {
              readme: detail.readme,
              hasDocs: detail.hasDocs,
              ciStatus: detail.ciStatus,
              ciCheckedAt: new Date(),
              openPullRequests: detail.openPullRequests,
              projectType: ptype.type,
              projectSubtype: ptype.subtype,
              typeSignals: ptype.signals,
              typeConfidence: ptype.confidence,
              isAiProject: ai.isAiProject,
              aiCategories: ai.categories,
              aiSignals: ai.signals,
              aiConfidence: ai.confidence,
              healthScore: health.score,
              healthFactors: health.factors,
              attention,
              detailSyncedAt: new Date(),
            },
          }),
        ]);
        detailsSynced++;
      } catch (e) {
        if (e instanceof ProviderError && (e.status === "rate_limited" || e.status === "auth_required")) throw e;
        // A single repo failing must not abort the whole sync.
        continue;
      }
    }

    // Activity events.
    let eventCount = 0;
    try {
      const events = await adapter.listEvents();
      const byFullName = new Map(
        (await prisma.repository.findMany({ where: { providerId: row.id }, select: { id: true, fullName: true } }))
          .map((r) => [r.fullName, r.id] as const),
      );
      for (const ev of events) {
        await prisma.activityEvent.upsert({
          where: { providerId_externalId: { providerId: row.id, externalId: ev.externalId } },
          create: {
            providerId: row.id,
            repositoryId: ev.repoFullName ? byFullName.get(ev.repoFullName) ?? null : null,
            externalId: ev.externalId,
            type: ev.type,
            action: ev.action,
            title: ev.title,
            actor: ev.actor,
            url: ev.url,
            state: ev.state,
            occurredAt: ev.occurredAt,
          },
          update: { state: ev.state, action: ev.action },
        });
        eventCount++;
      }
    } catch (e) {
      if (e instanceof ProviderError && e.status === "rate_limited") throw e;
    }

    const rate = adapter.getRate();
    await prisma.provider.update({
      where: { id: row.id },
      data: {
        status: "connected",
        statusDetail: null,
        accountLogin: account.login,
        accountName: account.name,
        avatarUrl: account.avatarUrl,
        lastSyncAt: new Date(),
        syncState: "idle",
        rateLimit: rate.limit,
        rateRemaining: rate.remaining,
        rateResetAt: rate.resetAt,
      },
    });

    return {
      provider: adapter.kind,
      status: "connected",
      repositories: repos.length,
      events: eventCount,
      detailsSynced,
    };
  } catch (e) {
    const err = e as Error;
    const status = e instanceof ProviderError ? e.status : "error";
    await prisma.provider.update({
      where: { id: row.id },
      data: { status, statusDetail: err.message, syncState: "error" },
    });
    return {
      provider: adapter.kind,
      status,
      repositories: 0,
      events: 0,
      detailsSynced: 0,
      error: err.message,
    };
  }
}

export async function syncAll(opts?: { detailLimit?: number }) {
  const reports: SyncReport[] = [];
  for (const adapter of getAdapters()) {
    if (!adapter.isConfigured()) {
      reports.push({ provider: adapter.kind, status: "not_connected", repositories: 0, events: 0, detailsSynced: 0 });
      continue;
    }
    reports.push(await syncProvider(adapter, opts));
  }
  await prisma.syncState.upsert({
    where: { key: "last_sync" },
    create: { key: "last_sync", value: { at: new Date().toISOString(), reports } as any },
    update: { value: { at: new Date().toISOString(), reports } as any },
  });
  return reports;
}

function dedupeDeps<T extends { name: string; ecosystem: string }>(deps: T[]): T[] {
  const seen = new Set<string>();
  return deps.filter((d) => {
    const k = `${d.ecosystem}:${d.name}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
