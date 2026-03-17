import { NextResponse } from "next/server";
import { getAllDares } from "@/lib/contract";
import { ZERO_ADDRESS, normalizeAddress } from "@/lib/config";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const dares = await getAllDares();

    // Top Earners: Approved dares grouped by claimer, sum rewardAmount
    const earnerMap = new Map<string, { address: string; total: bigint; count: number }>();
    for (const d of dares) {
      if (d.status !== "Approved") continue;
      const addr = normalizeAddress(d.claimer);
      if (addr === ZERO_ADDRESS) continue;
      const existing = earnerMap.get(addr);
      if (existing) {
        existing.total += d.rewardAmount;
        existing.count += 1;
      } else {
        earnerMap.set(addr, { address: addr, total: d.rewardAmount, count: 1 });
      }
    }
    const topEarners = [...earnerMap.values()]
      .sort((a, b) => (b.total > a.total ? 1 : b.total < a.total ? -1 : 0))
      .slice(0, 10)
      .map((e) => ({ address: e.address, total: e.total.toString(), count: e.count }));

    // Top Posters: all dares grouped by poster, count + sum rewardAmount
    const posterMap = new Map<string, { address: string; total: bigint; count: number }>();
    for (const d of dares) {
      const addr = normalizeAddress(d.poster);
      if (addr === ZERO_ADDRESS) continue;
      const existing = posterMap.get(addr);
      if (existing) {
        existing.total += d.rewardAmount;
        existing.count += 1;
      } else {
        posterMap.set(addr, { address: addr, total: d.rewardAmount, count: 1 });
      }
    }
    const topPosters = [...posterMap.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map((p) => ({ address: p.address, total: p.total.toString(), count: p.count }));

    // Top Voters: approximate from vote counts on dares
    // We can't get individual voters without events, so show most-voted dares instead
    const topVotedDares = dares
      .filter((d) => d.approveVotes + d.rejectVotes > 0)
      .sort((a, b) => (b.approveVotes + b.rejectVotes) - (a.approveVotes + a.rejectVotes))
      .slice(0, 10)
      .map((d) => ({
        dareId: d.id.toString(),
        title: d.title,
        totalVotes: d.approveVotes + d.rejectVotes,
        approveVotes: d.approveVotes,
        rejectVotes: d.rejectVotes,
      }));

    return NextResponse.json(
      { topEarners, topPosters, topVotedDares },
      { headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=60" } },
    );
  } catch (error) {
    return NextResponse.json(
      { detail: error instanceof Error ? error.message : "Failed to compute leaderboard." },
      { status: 500 },
    );
  }
}
