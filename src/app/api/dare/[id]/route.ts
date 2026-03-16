import { NextResponse } from "next/server";
import { getDare } from "@/lib/contract";
import { serializeDare } from "@/lib/serialize";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  try {
    const dare = await getDare(BigInt(id));
    return NextResponse.json(serializeDare(dare));
  } catch (error) {
    return NextResponse.json(
      { detail: error instanceof Error ? error.message : "Dare not found" },
      { status: 404 },
    );
  }
}
