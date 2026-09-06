import { NextResponse } from "next/server";
import { getSearchIndex } from "@/lib/queries";

export const dynamic = "force-dynamic";

/**
 * Serves the full search corpus once; the palette filters client-side so
 * keystrokes cost zero network round-trips.
 */
export async function GET() {
  try {
    const index = await getSearchIndex();
    return NextResponse.json(index, {
      headers: { "Cache-Control": "private, max-age=30, stale-while-revalidate=120" },
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
