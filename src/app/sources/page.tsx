import { getOverview } from "@/lib/queries";
import { ensureProviders } from "@/lib/sync";
import { PageHead, SyncButton } from "@/components/shell";
import { timeAgo } from "@/lib/format";

export const dynamic = "force-dynamic";

/** Providers not yet implemented are declared honestly, never simulated. */
const PLANNED = [
  { kind: "gitlab", note: "Adapter contract ready — credentials layer pending" },
  { kind: "bitbucket", note: "Adapter contract ready — credentials layer pending" },
  { kind: "huggingface", note: "Adapter contract ready — credentials layer pending" },
];

export default async function SourcesPage() {
  await ensureProviders();
  const overview = await getOverview();
  const github = overview.providers.find((p) => p.kind === "github");
  const connected = github?.status === "connected";

  return (
    <div className="page">
      <PageHead
        title="Sources"
        sub="Provider connections and sync state"
        status={{
          label: `${overview.connectedProviders} CONNECTED`,
          tone: overview.connectedProviders > 0 ? "ok" : "idle",
        }}
      />

      <section className="src">
        <div className="src-head">
          <div>
            <h2 className="src-name mono">GITHUB</h2>
            <p className="src-sub mono">
              {connected
                ? `${github?.accountLogin ?? "—"} · LAST SYNC ${timeAgo(github?.lastSyncAt ?? null)}`
                : String(github?.status ?? "not_connected").toUpperCase().replace("_", " ")}
            </p>
          </div>
          <span className={`badge mono ${connected ? "on" : "off"}`}>
            {connected ? "CONNECTED" : String(github?.status ?? "NOT CONNECTED").toUpperCase().replace("_", " ")}
          </span>
        </div>

        {github?.statusDetail && <p className="detail mono">{github.statusDetail}</p>}

        {connected ? (
          <>
            <dl className="facts">
              <div><dt className="label">Account</dt><dd className="mono">{github?.accountLogin ?? "—"}</dd></div>
              <div><dt className="label">Repositories</dt><dd className="mono">{overview.metrics.repositories}</dd></div>
              <div><dt className="label">API Budget</dt><dd className="mono">{github?.rateRemaining ?? "—"}/{github?.rateLimit ?? "—"}</dd></div>
              <div><dt className="label">Last Sync</dt><dd className="mono">{timeAgo(github?.lastSyncAt ?? null)}</dd></div>
            </dl>
            <SyncButton />
          </>
        ) : (
          <div className="setup">
            <p className="setup-lead">
              This build authenticates with a GitHub Personal Access Token held server-side. The token is read from the
              environment only — it is never sent to the browser and never stored in the database.
            </p>
            <ol className="steps">
              <li>
                Create a token at <span className="mono">github.com/settings/tokens</span> with the
                <span className="mono"> repo</span> and <span className="mono">read:user</span> scopes.
              </li>
              <li>
                Add it to <span className="mono">.env</span> at the project root:
                <pre className="code mono">GITHUB_TOKEN="ghp_your_token_here"</pre>
              </li>
              <li>Restart the server, then run a sync.</li>
            </ol>
            <SyncButton />
          </div>
        )}
      </section>

      <h2 className="label planned-head">Planned Providers</h2>
      <ul className="planned">
        {PLANNED.map((p) => (
          <li key={p.kind}>
            <span className="mono p-name">{p.kind.toUpperCase()}</span>
            <span className="p-note">{p.note}</span>
            <span className="badge mono off">NOT CONNECTED</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
