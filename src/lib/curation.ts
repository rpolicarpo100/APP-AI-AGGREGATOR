import fs from "node:fs";
import path from "node:path";

/**
 * Explicit curation: which repositories belong in the dashboard.
 *
 * The aggregator can reach every repository the token allows, but the user
 * decides which ones are actually part of their ecosystem. Repositories that
 * are listed but unreachable are surfaced honestly as MISSING rather than
 * silently dropped.
 */
export interface Curation {
  mode: "allowlist" | "all";
  repositories: string[];
}

const FILE = path.join(process.cwd(), "curation.json");

let cache: { value: Curation; mtime: number } | null = null;

export function getCuration(): Curation {
  try {
    const stat = fs.statSync(FILE);
    if (cache && cache.mtime === stat.mtimeMs) return cache.value;

    const raw = JSON.parse(fs.readFileSync(FILE, "utf8"));
    const repositories: string[] = Array.isArray(raw.repositories)
      ? raw.repositories.filter((r: unknown) => typeof r === "string" && r.trim())
      : [];
    const value: Curation = {
      mode: raw.mode === "all" || repositories.length === 0 ? "all" : "allowlist",
      repositories,
    };
    cache = { value, mtime: stat.mtimeMs };
    return value;
  } catch {
    // No curation file → aggregate everything reachable.
    return { mode: "all", repositories: [] };
  }
}

/** Case-insensitive match against the curated list. */
export function isCurated(name: string, curation = getCuration()): boolean {
  if (curation.mode === "all") return true;
  const n = name.toLowerCase();
  return curation.repositories.some((r) => r.toLowerCase() === n);
}

/** Curated entries that the provider did not return (deleted, renamed, no access). */
export function missingFrom(found: string[], curation = getCuration()): string[] {
  if (curation.mode === "all") return [];
  const have = new Set(found.map((f) => f.toLowerCase()));
  return curation.repositories.filter((r) => !have.has(r.toLowerCase()));
}
