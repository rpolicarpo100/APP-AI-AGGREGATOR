import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PageHead } from "@/components/shell";
import { HealthRing, timeAgo } from "@/components/primitives";
import type { AttentionFlag, HealthResult } from "@/lib/intelligence";

export const dynamic = "force-dynamic";

export default async function ProjectDetail({ params }: { params: Promise<{ fullName: string }> }) {
  const { fullName } = await params;
  const decoded = decodeURIComponent(fullName);

  const repo = await prisma.repository.findFirst({
    where: { fullName: decoded },
    include: {
      languages: { orderBy: { bytes: "desc" } },
      dependencies: { orderBy: [{ isAiRelated: "desc" }, { name: "asc" }] },
      events: { orderBy: { occurredAt: "desc" }, take: 18 },
      provider: { select: { kind: true } },
    },
  });

  if (!repo) notFound();

  const factors = (repo.healthFactors as unknown as HealthResult["factors"]) ?? [];
  const flags = (repo.attention as unknown as AttentionFlag[]) ?? [];
  const totalBytes = repo.languages.reduce((a, l) => a + l.bytes, 0);
  const aiDeps = repo.dependencies.filter((d) => d.isAiRelated);

  return (
    <div className="page">
      <nav className="crumbs mono" aria-label="Breadcrumb">
        <Link href="/projects">PROJECTS</Link>
        <span aria-hidden="true">/</span>
        <span>{repo.name.toUpperCase()}</span>
      </nav>

      <PageHead
        title={repo.name}
        sub={`${repo.fullName} · ${repo.provider.kind.toUpperCase()}`}
        status={{
          label: repo.isArchived ? "ARCHIVED" : repo.ciStatus === "failure" ? "CI FAILING" : "ACTIVE",
          tone: repo.isArchived ? "idle" : repo.ciStatus === "failure" ? "crit" : "ok",
        }}
      />

      <section className="hero">
        <div className="hero-health">
          <HealthRing score={repo.healthScore} size={104} />
          <span className="label" style={{ marginTop: 12 }}>Project Health</span>
        </div>

        <div className="hero-info">
          <div className="typerow">
            {repo.projectType !== "UNKNOWN" && (
              <span className={`type-tag mono ty-${repo.projectType.toLowerCase()}`}>
                {repo.projectSubtype ? `${repo.projectType} · ${repo.projectSubtype}` : repo.projectType}
              </span>
            )}
            {repo.isAiProject && <span className="ai-tag mono">AI PROJECT</span>}
          </div>
          <p className="hero-desc">{repo.description ?? "No description provided."}</p>
          <ul className="factors">
            {factors.map((f) => (
              <li key={f.label} className={`factor mono ${f.ok ? "ok" : "bad"}`}>
                <span className="fdot" aria-hidden="true" />
                {f.label}
                <span className="fdetail">{f.detail}</span>
              </li>
            ))}
          </ul>
          <div className="hero-links">
            <a className="linkbtn mono" href={repo.url} target="_blank" rel="noopener noreferrer">OPEN REPOSITORY</a>
            {repo.homepage && (
              <a className="linkbtn mono" href={repo.homepage} target="_blank" rel="noopener noreferrer">HOMEPAGE</a>
            )}
          </div>
        </div>
      </section>

      <div className="statline">
        {[
          { k: "Stars", v: repo.stars },
          { k: "Forks", v: repo.forks },
          { k: "Open Issues", v: repo.openIssues },
          { k: "Open PRs", v: repo.openPullRequests },
          { k: "Dependencies", v: repo.dependencies.length },
          { k: "Size", v: `${Math.round(repo.sizeKb / 1024)} MB` },
        ].map((s) => (
          <div key={s.k} className="stat">
            <span className="label">{s.k}</span>
            <span className="stat-v mono">{s.v}</span>
          </div>
        ))}
      </div>

      {flags.length > 0 && (
        <section className="panelbox">
          <h2 className="label">Attention</h2>
          <ul className="flaglist">
            {flags.map((f) => (
              <li key={f.code} className={`flagrow sev-${f.severity}`}>
                <span className="mono fcode">{f.code}</span>
                <span className="fmsg">{f.detail}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="columns">
        <section className="panel">
          <div className="panel-head"><h2 className="label">Tech Stack</h2></div>
          {repo.languages.length === 0 ? (
            <p className="quiet mono">NO LANGUAGE DATA</p>
          ) : (
            <ul className="bars">
              {repo.languages.slice(0, 8).map((l) => {
                const share = totalBytes ? Math.round((l.bytes / totalBytes) * 100) : 0;
                return (
                  <li key={l.id}>
                    <span className="bar-top">
                      <span className="bar-name mono">{l.name}</span>
                      <span className="bar-val mono">{share}%</span>
                    </span>
                    <span className="track" aria-hidden="true"><span className="fill" style={{ width: `${share}%` }} /></span>
                  </li>
                );
              })}
            </ul>
          )}

          {repo.isAiProject && (
            <>
              <div className="panel-head" style={{ marginTop: 24 }}>
                <h2 className="label">AI Capabilities</h2>
              </div>
              <div className="cats">
                {repo.aiCategories.map((c) => <span key={c} className="cat mono">{c}</span>)}
              </div>
              <div className="signals mono" style={{ marginTop: 12 }}>
                {repo.aiSignals.map((s) => <span key={s} className="signal">{s}</span>)}
              </div>
            </>
          )}
        </section>

        <section className="panel">
          <div className="panel-head"><h2 className="label">Recent Events</h2></div>
          {repo.events.length === 0 ? (
            <p className="quiet mono">NO EVENTS RECORDED FOR THIS REPOSITORY</p>
          ) : (
            <ol className="timeline">
              {repo.events.map((e) => (
                <li key={e.id}>
                  <time className="t mono" dateTime={e.occurredAt.toISOString()}>
                    {e.occurredAt.toISOString().slice(11, 16)}
                  </time>
                  <span className="node" aria-hidden="true" />
                  <span className="ev">
                    <span className="ev-repo mono">{timeAgo(e.occurredAt)}</span>
                    <span className="ev-title">{e.title}</span>
                  </span>
                  <span className={`ev-type mono t-${e.type}`}>{e.type.replace("_", " ")}</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      {repo.dependencies.length > 0 && (
        <section className="panelbox">
          <h2 className="label">Dependencies · {repo.dependencies.length}</h2>
          {aiDeps.length > 0 && <p className="quiet mono" style={{ padding: "10px 0 0" }}>{aiDeps.length} AI-RELATED</p>}
          <ul className="deps">
            {repo.dependencies.slice(0, 90).map((d) => (
              <li key={d.id} className={`dep mono${d.isAiRelated ? " is-ai" : ""}`}>
                {d.name}
                {d.version && <span className="dv">{d.version}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="panelbox">
        <h2 className="label">Readme</h2>
        {repo.readme ? (
          <pre className="readme mono">{repo.readme.slice(0, 12000)}</pre>
        ) : (
          <p className="quiet mono">NO README FOUND IN THIS REPOSITORY</p>
        )}
      </section>
    </div>
  );
}
