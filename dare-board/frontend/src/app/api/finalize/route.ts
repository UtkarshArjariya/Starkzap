import { NextResponse } from "next/server";
import { Account, CallData, RpcProvider } from "starknet";
import DARE_BOARD_ABI from "@/lib/abi.json";
import { CONTRACT_ADDRESS, RPC_URL } from "@/lib/config";
import { getAllDares } from "@/lib/contract";
import type { WalletAccount } from "@/lib/types";

function createServerWallet(): WalletAccount {
  const address = process.env.DEPLOYER_ACCOUNT_ADDRESS;
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;

  if (!address || !privateKey) {
    throw new Error("DEPLOYER_ACCOUNT_ADDRESS and DEPLOYER_PRIVATE_KEY are required for finalize automation");
  }

  const provider = new RpcProvider({ nodeUrl: RPC_URL });
  const account = new Account(provider, address, privateKey);

  return {
    address,
    execute: async (calls) => {
      const result = await account.execute(calls as never);
      return { transaction_hash: result.transaction_hash };
    },
  };
}

function requireCronSecret(request: Request) {
  const expectedSecret = process.env.CRON_SECRET;

  if (!expectedSecret) {
    return;
  }

  const providedSecret = request.headers.get("x-cron-secret") || request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (providedSecret !== expectedSecret) {
    throw new Error("Unauthorized finalize request");
  }
}

async function finalizeDareWithServerWallet(wallet: WalletAccount, dareId: bigint): Promise<string> {
  const calldata = new CallData(DARE_BOARD_ABI).compile("finalize_dare", { dare_id: dareId });
  const result = await wallet.execute([
    {
      contractAddress: CONTRACT_ADDRESS,
      entrypoint: "finalize_dare",
      calldata,
    },
  ]);

  return result.transaction_hash;
}

export async function POST(request: Request) {
  try {
    requireCronSecret(request);

    if (!CONTRACT_ADDRESS) {
      return NextResponse.json({ detail: "NEXT_PUBLIC_CONTRACT_ADDRESS is not configured" }, { status: 400 });
    }

    const wallet = createServerWallet();
    const dares = await getAllDares();
    const now = Math.floor(Date.now() / 1000);
    const candidates = dares.filter(
      (dare) =>
        (dare.status === "Voting" && now >= dare.votingEnd) ||
        ((dare.status === "Claimed" || dare.status === "Open") && now > dare.deadline),
    );

    const finalized: Array<{ id: string; txHash: string }> = [];

    for (const dare of candidates) {
      const txHash = await finalizeDareWithServerWallet(wallet, dare.id);
      finalized.push({ id: dare.id.toString(), txHash });
    }

    return NextResponse.json({ finalized });
  } catch (error) {
    return NextResponse.json(
      { detail: error instanceof Error ? error.message : "Finalize route failed" },
      { status: error instanceof Error && error.message === "Unauthorized finalize request" ? 401 : 500 },
    );
  }
}
