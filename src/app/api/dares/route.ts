import { NextResponse } from "next/server";
import { getAllDares } from "@/lib/contract";
import { serializeDare } from "@/lib/serialize";

// Never prerender this route at build time – it queries the live blockchain.
// CDN / edge caches are controlled via Cache-Control headers below.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const dares = await getAllDares();

    return NextResponse.json(
      dares.map((dare) => serializeDare(dare)),
      {
        headers: {
          "Cache-Control": "s-maxage=10, stale-while-revalidate=30",
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        detail:
          error instanceof Error ? error.message : "Failed to fetch dares.",
      },
      { status: 500 },
    );
  }
}
