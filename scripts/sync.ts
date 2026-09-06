/**
 * CLI / cron entrypoint for background synchronization.
 *   npm run sync
 * Schedule with cron to keep data fresh without relying on page loads.
 */
import "dotenv/config";
import { syncAll } from "../src/lib/sync";

async function main() {
  const started = Date.now();
  console.log("[sync] starting");
  const reports = await syncAll();
  for (const r of reports) {
    console.log(
      `[sync] ${r.provider}: ${r.status} · repos=${r.repositories} details=${r.detailsSynced} events=${r.events}` +
        (r.error ? ` · error=${r.error}` : ""),
    );
  }
  console.log(`[sync] finished in ${((Date.now() - started) / 1000).toFixed(1)}s`);
}

main()
  .catch((e) => {
    console.error("[sync] fatal:", e);
    process.exit(1);
  })
  .then(() => process.exit(0));
