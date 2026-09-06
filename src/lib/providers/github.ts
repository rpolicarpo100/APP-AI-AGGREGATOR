import {
  ProviderAdapter,
  ProviderError,
  NormalizedAccount,
  NormalizedRepository,
  NormalizedEvent,
  NormalizedDependency,
  RepositoryDetail,
  RateInfo,
} from "./types";

const API = "https://api.github.com";

/**
 * GitHub adapter. Token is read server-side only and never leaves this module.
 */
export class GitHubAdapter implements ProviderAdapter {
  kind = "github" as const;
  private rate: RateInfo = { limit: null, remaining: null, resetAt: null };

  constructor(private token = process.env.GITHUB_TOKEN ?? "") {}

  isConfigured() {
    return this.token.trim().length > 0;
  }

  getRate() {
    return this.rate;
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T | null> {
    if (!this.isConfigured()) {
      throw new ProviderError("GitHub token not configured", "not_connected");
    }
    let res: Response;
    try {
      res = await fetch(path.startsWith("http") ? path : `${API}${path}`, {
        ...init,
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${this.token}`,
          "X-GitHub-Api-Version": "2022-11-28",
          "User-Agent": "app-ai-aggregator",
          ...(init?.headers ?? {}),
        },
        cache: "no-store",
      });
    } catch (e) {
      throw new ProviderError(`Network failure: ${(e as Error).message}`, "error");
    }

    const limit = res.headers.get("x-ratelimit-limit");
    const remaining = res.headers.get("x-ratelimit-remaining");
    const reset = res.headers.get("x-ratelimit-reset");
    this.rate = {
      limit: limit ? Number(limit) : null,
      remaining: remaining ? Number(remaining) : null,
      resetAt: reset ? new Date(Number(reset) * 1000) : null,
    };

    if (res.status === 401) throw new ProviderError("Authentication expired or invalid token", "auth_required", 401);
    if (res.status === 403 && this.rate.remaining === 0)
      throw new ProviderError("GitHub API rate limit exceeded", "rate_limited", 403);
    if (res.status === 403) throw new ProviderError("Permission denied", "error", 403);
    if (res.status === 404) return null; // resource absent — caller decides
    if (!res.ok) throw new ProviderError(`GitHub API error ${res.status}`, "error", res.status);

    return (await res.json()) as T;
  }

  private async raw(path: string): Promise<string | null> {
    if (!this.isConfigured()) throw new ProviderError("GitHub token not configured", "not_connected");
    const res = await fetch(`${API}${path}`, {
      headers: {
        Accept: "application/vnd.github.raw",
        Authorization: `Bearer ${this.token}`,
        "User-Agent": "app-ai-aggregator",
      },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return res.text();
  }

  async getAccount(): Promise<NormalizedAccount> {
    const u = await this.request<any>("/user");
    if (!u) throw new ProviderError("Could not resolve account", "error");
    return { login: u.login, name: u.name ?? null, avatarUrl: u.avatar_url ?? null };
  }

  async listRepositories(): Promise<NormalizedRepository[]> {
    const out: NormalizedRepository[] = [];
    for (let page = 1; page <= 10; page++) {
      const batch = await this.request<any[]>(
        `/user/repos?per_page=100&page=${page}&affiliation=owner,collaborator,organization_member&sort=pushed`,
      );
      if (!batch || batch.length === 0) break;
      out.push(...batch.map(mapRepo));
      if (batch.length < 100) break;
    }
    return out;
  }

  async getRepositoryDetail(fullName: string, defaultBranch: string | null): Promise<RepositoryDetail> {
    const [langs, runs, prs, readme, pkg, reqs, pyproject, docs] = await Promise.all([
      this.request<Record<string, number>>(`/repos/${fullName}/languages`).catch(() => null),
      this.request<any>(`/repos/${fullName}/actions/runs?per_page=1`).catch(() => null),
      this.request<any[]>(`/repos/${fullName}/pulls?state=open&per_page=100`).catch(() => null),
      this.raw(`/repos/${fullName}/readme`).catch(() => null),
      this.raw(`/repos/${fullName}/contents/package.json`).catch(() => null),
      this.raw(`/repos/${fullName}/contents/requirements.txt`).catch(() => null),
      this.raw(`/repos/${fullName}/contents/pyproject.toml`).catch(() => null),
      this.request<any>(`/repos/${fullName}/contents/docs`).catch(() => null),
    ]);

    const dependencies: NormalizedDependency[] = [
      ...parsePackageJson(pkg),
      ...parseRequirements(reqs),
      ...parsePyproject(pyproject),
    ];

    let ciStatus: RepositoryDetail["ciStatus"] = "none";
    const run = runs?.workflow_runs?.[0];
    if (run) {
      if (run.status !== "completed") ciStatus = "pending";
      else if (run.conclusion === "success") ciStatus = "success";
      else if (run.conclusion === "failure" || run.conclusion === "timed_out") ciStatus = "failure";
      else ciStatus = "none";
    }

    return {
      languages: Object.entries(langs ?? {}).map(([name, bytes]) => ({ name, bytes: Number(bytes) })),
      dependencies,
      readme: readme ? readme.slice(0, 40000) : null,
      hasDocs: Array.isArray(docs) && docs.length > 0,
      ciStatus,
      openPullRequests: prs?.length ?? 0,
    };
  }

  async listEvents(): Promise<NormalizedEvent[]> {
    const account = await this.getAccount();
    const events: NormalizedEvent[] = [];
    for (let page = 1; page <= 3; page++) {
      const batch = await this.request<any[]>(`/users/${account.login}/events?per_page=100&page=${page}`);
      if (!batch || batch.length === 0) break;
      for (const e of batch) {
        const mapped = mapEvent(e);
        if (mapped) events.push(...mapped);
      }
      if (batch.length < 100) break;
    }
    return events;
  }
}

function mapRepo(r: any): NormalizedRepository {
  return {
    externalId: String(r.id),
    name: r.name,
    fullName: r.full_name,
    description: r.description ?? null,
    url: r.html_url,
    homepage: r.homepage || null,
    isPrivate: !!r.private,
    isFork: !!r.fork,
    isArchived: !!r.archived,
    defaultBranch: r.default_branch ?? null,
    primaryLanguage: r.language ?? null,
    stars: r.stargazers_count ?? 0,
    forks: r.forks_count ?? 0,
    watchers: r.watchers_count ?? 0,
    openIssues: r.open_issues_count ?? 0,
    sizeKb: r.size ?? 0,
    topics: r.topics ?? [],
    pushedAt: r.pushed_at ? new Date(r.pushed_at) : null,
    createdAtRemote: r.created_at ? new Date(r.created_at) : null,
    updatedAtRemote: r.updated_at ? new Date(r.updated_at) : null,
  };
}

function mapEvent(e: any): NormalizedEvent[] | null {
  const at = new Date(e.created_at);
  const repo = e.repo?.name ?? null;
  const actor = e.actor?.login ?? null;
  const base = { actor, occurredAt: at, repoFullName: repo };

  switch (e.type) {
    case "PushEvent": {
      const commits = e.payload?.commits ?? [];
      return commits.map((c: any, i: number) => ({
        ...base,
        externalId: `${e.id}-${c.sha ?? i}`,
        type: "commit" as const,
        action: "pushed",
        title: (c.message ?? "").split("\n")[0] || "commit",
        url: repo && c.sha ? `https://github.com/${repo}/commit/${c.sha}` : null,
        state: null,
      }));
    }
    case "IssuesEvent":
      return [{
        ...base,
        externalId: e.id,
        type: "issue",
        action: e.payload?.action ?? null,
        title: e.payload?.issue?.title ?? "issue",
        url: e.payload?.issue?.html_url ?? null,
        state: e.payload?.issue?.state ?? null,
      }];
    case "PullRequestEvent":
      return [{
        ...base,
        externalId: e.id,
        type: "pull_request",
        action: e.payload?.action ?? null,
        title: e.payload?.pull_request?.title ?? "pull request",
        url: e.payload?.pull_request?.html_url ?? null,
        state: e.payload?.pull_request?.state ?? null,
      }];
    case "ReleaseEvent":
      return [{
        ...base,
        externalId: e.id,
        type: "release",
        action: e.payload?.action ?? null,
        title: e.payload?.release?.name || e.payload?.release?.tag_name || "release",
        url: e.payload?.release?.html_url ?? null,
        state: null,
      }];
    case "WorkflowRunEvent":
      return [{
        ...base,
        externalId: e.id,
        type: "workflow",
        action: e.payload?.action ?? null,
        title: e.payload?.workflow_run?.name ?? "workflow",
        url: e.payload?.workflow_run?.html_url ?? null,
        state: e.payload?.workflow_run?.conclusion ?? null,
      }];
    default:
      return null;
  }
}

function parsePackageJson(text: string | null): NormalizedDependency[] {
  if (!text) return [];
  try {
    const json = JSON.parse(text);
    const all = { ...(json.dependencies ?? {}), ...(json.devDependencies ?? {}) };
    return Object.entries(all).map(([name, version]) => ({
      name,
      version: typeof version === "string" ? version : null,
      ecosystem: "npm" as const,
    }));
  } catch {
    return [];
  }
}

function parseRequirements(text: string | null): NormalizedDependency[] {
  if (!text) return [];
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#") && !l.startsWith("-"))
    .map((l) => {
      const m = l.match(/^([A-Za-z0-9._-]+)\s*([<>=!~^].*)?$/);
      if (!m) return null;
      return { name: m[1].toLowerCase(), version: m[2]?.trim() ?? null, ecosystem: "pypi" as const };
    })
    .filter(Boolean) as NormalizedDependency[];
}

function parsePyproject(text: string | null): NormalizedDependency[] {
  if (!text) return [];
  const out: NormalizedDependency[] = [];
  const block = text.match(/dependencies\s*=\s*\[([\s\S]*?)\]/);
  if (block) {
    for (const raw of block[1].split(",")) {
      const m = raw.match(/["']([A-Za-z0-9._-]+)\s*([^"']*)["']/);
      if (m) out.push({ name: m[1].toLowerCase(), version: m[2]?.trim() || null, ecosystem: "pypi" });
    }
  }
  return out;
}
