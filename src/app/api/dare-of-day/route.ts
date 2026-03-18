import { NextResponse } from "next/server";
import { getAllDares } from "@/lib/contract";
import { serializeDare } from "@/lib/serialize";

export const dynamic = "force-dynamic";

/** Simple day-based index so the pick rotates every 24 hours. */
function dayIndex(count: number): number {
  const daysSinceEpoch = Math.floor(Date.now() / 86_400_000);
  return daysSinceEpoch % count;
}

export async function GET() {
  try {
    const dares = await getAllDares();

    // Candidates: Voting dares sorted by total votes (desc), then Open dares sorted by reward (desc)
    const votingDares = dares
      .filter((d) => d.status === "Voting")
      .sort((a, b) => (b.approveVotes + b.rejectVotes) - (a.approveVotes + a.rejectVotes));

    const openDares = dares
      .filter((d) => d.status === "Open")
      .sort((a, b) => (b.rewardAmount > a.rewardAmount ? 1 : b.rewardAmount < a.rewardAmount ? -1 : 0));

    // Use Voting dares first, fall back to Open dares
    const candidates = votingDares.length > 0 ? votingDares : openDares;

    if (candidates.length === 0) {
      return NextResponse.json(null, {
        headers: { "Cache-Control": "s-maxage=3600, stale-while-revalidate=300" },
      });
    }

    // Rotate through candidates daily
    const pick = candidates[dayIndex(candidates.length)];

    return NextResponse.json(serializeDare(pick), {
      headers: { "Cache-Control": "s-maxage=3600, stale-while-revalidate=300" },
    });
  } catch (error) {
    return NextResponse.json(
      { detail: error instanceof Error ? error.message : "Failed to fetch dare of the day." },
      { status: 500 },
    );
  }
}
