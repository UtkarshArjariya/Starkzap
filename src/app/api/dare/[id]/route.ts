import { NextResponse } from "next/server";

import { getDare, toApiDarePayload } from "@/lib/contract";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const voter = new URL(request.url).searchParams.get("voter") ?? undefined;

  try {
    const dare = await getDare(BigInt(params.id), voter);
    return NextResponse.json({ dare: toApiDarePayload(dare) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Dare not found." },
      { status: 404 }
    );
  }
}
