# APP AI AGGREGATOR

> One interface for your entire AI & developer ecosystem.

An AI & Developer Command Center that aggregates your repositories, activity and AI projects
into a single futuristic dashboard — built on **real data only**.

## Principles

- **100% FREE** — no tiers, paywalls or artificial limits
- **100% REAL** — no mock data. No source connected means `NOT CONNECTED`, not fake numbers
- **100% FUNCTIONAL** — every button, filter and search actually works
- **FAST** — server components, single-fetch search index, incremental sync

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, RSC, Turbopack) |
| UI | React 19, scoped CSS |
| Database | PostgreSQL 17 + Prisma 7 |
| Provider | GitHub REST API (server-side only) |

## Architecture

```
GitHub API
    ↓  GitHubAdapter        src/lib/providers/github.ts
    ↓  Normalized types     src/lib/providers/types.ts
    ↓  Intelligence         src/lib/intelligence.ts    AI · Health · Attention
    ↓  Sync orchestrator    src/lib/sync.ts
    ↓  PostgreSQL           prisma/schema.prisma
    ↓  Aggregation queries  src/lib/queries.ts
    ↓  React Server Components → UI
```

The frontend never sees a provider-specific payload. Adding GitLab, Bitbucket or Hugging Face
means implementing `ProviderAdapter` and registering it in `getAdapters()` — no UI changes.

## Setup

One command bootstraps everything — Postgres, database, schema, dependencies:

```bash
npm run setup
```

It is idempotent, so re-run it any time (for example after restarting the machine).
Then add your token to `.env`:

```
GITHUB_TOKEN="github_pat_..."
```

Fine-grained token: set **Repository access → All repositories** and grant read-only
`Contents`, `Metadata`, `Issues`, `Pull requests` and `Actions`.

```bash
npm run dev
```

Open the app and press **SYNC NOW** (or `CTRL/CMD + K` → *Refresh GitHub data*).

### Scripts

| Command | Purpose |
|---|---|
| `npm run setup` | Bootstrap Postgres, schema and dependencies |
| `npm run dev` | Development server on port 3000 |
| `npm run sync` | Pull fresh data from GitHub |
| `npm run studio` | Inspect the database visually |
| `npm run build` | Production build |

## Background sync

```bash
npm run sync      # cron-ready, does not depend on page loads
```

## Features

| Area | Description |
|---|---|
| **Dashboard** | Live aggregate metrics computed from synced data |
| **Command Palette** | `CTRL/CMD + K` — universal search over repos, languages and commands |
| **Projects** | Instant client-side filtering by status, language, CI and AI |
| **AI Projects** | Classified from real dependencies, topics and README content |
| **Attention Center** | CI failures, stale projects, PR backlogs, issue overload |
| **Global Activity** | Unified timeline of commits, issues, PRs, releases, workflows |
| **Project Detail** | Health breakdown, tech stack, dependencies, events, README |

### AI classification

Detection runs on real signals only — dependencies (`openai`, `torch`, `langgraph`, `ccxt`…),
repository topics and README content. Categories: `LLM`, `AI AGENTS`, `RAG`, `VISION`,
`MACHINE LEARNING`, `GENERATIVE AI`, `TRADING AI`, `AUTOMATION`, `TOOLS`.

A dependency match weighs more than a keyword match, so a blog that merely mentions "AI"
is not classified as an AI project.

### Health score

Derived from push recency, archive state, CI conclusion, issue load, PR backlog and
documentation presence. Never estimated when data is missing — it renders as `—`.

## Security

- The GitHub token is read server-side from the environment and **never** reaches the browser
- Tokens are not persisted in the database
- `.env` is git-ignored; use `.env.example` as the template

## Accessibility

Full keyboard navigation, semantic HTML, ARIA roles on the command palette, visible focus
states, skip link, and `prefers-reduced-motion` respected across all animations.

## License

MIT
