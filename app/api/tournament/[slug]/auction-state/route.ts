import { NextResponse } from "next/server";
import { getLiveAuctionSnapshot } from "@courtpulse/tournaments/tournament.queries";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;
  const snapshot = getLiveAuctionSnapshot(slug);
  if (!snapshot) {
    return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
  }
  return NextResponse.json(snapshot, {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
