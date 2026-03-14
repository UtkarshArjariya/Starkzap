import { NextResponse } from "next/server";
import { getAllDares } from "@/lib/contract";
import { serializeDare } from "@/lib/serialize";

export const revalidate = 10;

export async function GET() {
  const dares = await getAllDares();

  return NextResponse.json(
    dares.map((dare) => serializeDare(dare)),
    {
      headers: {
        "Cache-Control": "s-maxage=10, stale-while-revalidate=30",
      },
    },
  );
}
