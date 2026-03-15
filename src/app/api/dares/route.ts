import { NextResponse } from "next/server";

import { getAllDares, toApiDarePayload } from "@/lib/contract";

export const revalidate = 10;

export async function GET(request: Request) {
  const voter = new URL(request.url).searchParams.get("voter") ?? undefined;
  const dares = await getAllDares(voter);

  return NextResponse.json(
    { dares: dares.map(toApiDarePayload) },
    {
      headers: {
        "Cache-Control": "s-maxage=10, stale-while-revalidate=59"
      }
    }
  );
}
