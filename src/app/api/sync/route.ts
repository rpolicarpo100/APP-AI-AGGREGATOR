import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { syncAll } from "@/lib/sync";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

let inFlight: Promise<unknown> | null = null;

/** Request deduplication: concurrent refreshes share one upstream sync. */
export async function POST() {
  try {
    if (!inFlight) {
      inFlight = syncAll().finally(() => {
        inFlight = null;
      });
    }
    const reports = await inFlight;
    for (const p of ["/", "/projects", "/ai", "/attention", "/activity", "/sources"]) revalidatePath(p);
    return NextResponse.json({ ok: true, reports });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
