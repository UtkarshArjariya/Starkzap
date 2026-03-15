import { NextResponse } from "next/server";
import { Account, RpcProvider } from "starknet";

import { finalizeDare, getAllDares } from "@/lib/contract";

const RPC_URL =
  process.env.NEXT_PUBLIC_RPC_URL ?? "https://starknet-sepolia.drpc.org";

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

async function runFinalize() {
  const provider = new RpcProvider({ nodeUrl: RPC_URL });
  const account = new Account({
    provider,
    address: requireEnv("DEPLOYER_PUBLIC_KEY"),
    signer: requireEnv("DEPLOYER_PRIVATE_KEY"),
    cairoVersion: "1"
  });

  const dares = await getAllDares();
  const now = Math.floor(Date.now() / 1000);
  const eligible = dares.filter(
    (dare) =>
      (dare.status === "Voting" && now >= dare.votingEnd) ||
      ((dare.status === "Open" || dare.status === "Claimed") && now > dare.deadline)
  );

  const hashes: string[] = [];
  for (const dare of eligible) {
    const response = await finalizeDare(account, dare.id);
    hashes.push(response.transaction_hash);
  }

  return { finalized: eligible.length, hashes };
}

export async function GET() {
  try {
    return NextResponse.json(await runFinalize());
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Finalize failed." },
      { status: 500 }
    );
  }
}

export async function POST() {
  return GET();
}
