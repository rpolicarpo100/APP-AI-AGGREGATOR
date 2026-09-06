/**
 * Provider-agnostic contracts. Every integration (GitHub, GitLab, Hugging Face…)
 * implements ProviderAdapter and returns Normalized* shapes, so the UI and the
 * database never learn anything provider-specific.
 */

export type ProviderKind = "github" | "gitlab" | "bitbucket" | "huggingface";

export type ProviderStatus =
  | "not_connected"
  | "connected"
  | "error"
  | "rate_limited"
  | "auth_required";

export interface NormalizedAccount {
  login: string;
  name: string | null;
  avatarUrl: string | null;
}

export interface NormalizedRepository {
  externalId: string;
  name: string;
  fullName: string;
  description: string | null;
  url: string;
  homepage: string | null;
  isPrivate: boolean;
  isFork: boolean;
  isArchived: boolean;
  defaultBranch: string | null;
  primaryLanguage: string | null;
  stars: number;
  forks: number;
  watchers: number;
  openIssues: number;
  sizeKb: number;
  topics: string[];
  pushedAt: Date | null;
  createdAtRemote: Date | null;
  updatedAtRemote: Date | null;
  hasPages: boolean;
}

export interface NormalizedEvent {
  externalId: string;
  type: "commit" | "issue" | "pull_request" | "release" | "workflow";
  action: string | null;
  title: string;
  actor: string | null;
  url: string | null;
  state: string | null;
  occurredAt: Date;
  repoFullName: string | null;
}

export interface NormalizedDependency {
  name: string;
  version: string | null;
  ecosystem: "npm" | "pypi";
}

export interface RepositoryDetail {
  languages: { name: string; bytes: number }[];
  dependencies: NormalizedDependency[];
  readme: string | null;
  hasDocs: boolean;
  ciStatus: "success" | "failure" | "pending" | "none" | null;
  openPullRequests: number;
  /** Top-level entry names, used to infer what the project structurally is. */
  fileNames: string[];
}

export class ProviderError extends Error {
  constructor(
    message: string,
    public status: ProviderStatus,
    public httpStatus?: number,
  ) {
    super(message);
    this.name = "ProviderError";
  }
}

export interface RateInfo {
  limit: number | null;
  remaining: number | null;
  resetAt: Date | null;
}

export interface ProviderAdapter {
  kind: ProviderKind;
  /** True when credentials exist. Never fabricate a connection. */
  isConfigured(): boolean;
  getAccount(): Promise<NormalizedAccount>;
  listRepositories(): Promise<NormalizedRepository[]>;
  getRepositoryDetail(fullName: string, defaultBranch: string | null): Promise<RepositoryDetail>;
  listEvents(): Promise<NormalizedEvent[]>;
  getRate(): RateInfo;
}
