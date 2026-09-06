import { getOverview, getRecentActivity } from "@/lib/queries";
import { EmptyState, PageHead } from "@/components/shell";
import { ActivityStream } from "@/components/ActivityStream";

export const dynamic = "force-dynamic";

export default async function ActivityPage() {
  const overview = await getOverview();
  const initial = await getRecentActivity({ limit: 60 });

  if (initial.length === 0) {
    return (
      <div className="page">
        <PageHead title="Global Activity" sub="Unified event timeline" status={{ label: overview.hasAnyData ? "NO EVENTS" : "NO DATA", tone: "idle" }} />
        <EmptyState
          headline="No activity synced"
          body="The timeline is fed by real provider events — commits, issues, pull requests, releases and workflow runs. Connect a source and sync to populate it."
          actionLabel="CONNECT GITHUB"
          actionHref="/sources"
        />
      </div>
    );
  }

  return (
    <div className="page">
      <PageHead title="Global Activity" sub="Unified event timeline" status={{ label: "ONLINE", tone: "ok" }} />
      <ActivityStream
        initial={initial.map((e) => ({
          id: e.id,
          type: e.type,
          action: e.action,
          title: e.title,
          url: e.url,
          state: e.state,
          occurredAt: e.occurredAt.toISOString(),
          repoName: e.repository?.name ?? null,
        }))}
      />
    </div>
  );
}
