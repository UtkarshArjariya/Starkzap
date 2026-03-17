import { NextResponse } from "next/server";
import { getAllDares } from "@/lib/contract";
import { serializeDare } from "@/lib/serialize";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const dares = await getAllDares();

    // Pick: highest total votes among Voting dares
    const votingDares = dares.filter((d) => d.status === "Voting");
    let pick = votingDares.length > 0
      ? votingDares.reduce((best, d) =>
          (d.approveVotes + d.rejectVotes) > (best.approveVotes + best.rejectVotes) ? d : best,
        )
      : null;

    // Fallback: highest rewardAmount among Open dares
    if (!pick) {
      const openDares = dares.filter((d) => d.status === "Open");
      if (openDares.length > 0) {
        pick = openDares.reduce((best, d) => d.rewardAmount > best.rewardAmount ? d : best);
      }
    }

    if (!pick) {
      return NextResponse.json(null, {
        headers: { "Cache-Control": "s-maxage=3600, stale-while-revalidate=300" },
      });
    }

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
