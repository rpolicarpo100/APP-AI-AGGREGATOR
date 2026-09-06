import { NextRequest, NextResponse } from "next/server";
import { getRecentActivity } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get("type") ?? "all";
  const limit = Math.min(200, Number(req.nextUrl.searchParams.get("limit") ?? 40));
  try {
    const events = await getRecentActivity({ type, limit });
    return NextResponse.json({ events });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
