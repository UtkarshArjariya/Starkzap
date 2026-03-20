import { NextResponse } from "next/server";
import { Account, CallData, RpcProvider } from "starknet";
import DARE_BOARD_ABI from "@/lib/abi.json";
import { CONTRACT_ADDRESS, RPC_URL } from "@/lib/config";
import { getAllDares } from "@/lib/contract";
import type { WalletAccount } from "@/lib/types";

// ─── Server-side deployer wallet ─────────────────────────────────────────────

function createServerWallet(): WalletAccount {
  // Env vars match the keys defined in .env.local (server-side only)
  const address = process.env.DEPLOYER_PUBLIC_KEY;
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;

  if (!address || !privateKey) {
    throw new Error(
      "DEPLOYER_PUBLIC_KEY and DEPLOYER_PRIVATE_KEY must be set for finalize automation.",
    );
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

// ─── Auth guard ───────────────────────────────────────────────────────────────

function requireCronSecret(request: Request) {
  const expectedSecret = process.env.CRON_SECRET;

  // If no secret is configured, reject the request in production.
  if (!expectedSecret) {
    throw new Error("CRON_SECRET not configured — set it in environment variables");
  }

  const provided =
    request.headers.get("x-cron-secret") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (provided !== expectedSecret) {
    throw new Error("Unauthorized finalize request");
  }
}

// ─── Core finalize helper ─────────────────────────────────────────────────────

async function finalizeDareOnChain(
  wallet: WalletAccount,
  dareId: bigint,
): Promise<string> {
  const calldata = new CallData(DARE_BOARD_ABI).compile("finalize_dare", {
    dare_id: dareId,
  });

  const result = await wallet.execute([
    {
      contractAddress: CONTRACT_ADDRESS,
      entrypoint: "finalize_dare",
      calldata,
    },
  ]);

  return result.transaction_hash;
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    requireCronSecret(request);

    if (!CONTRACT_ADDRESS) {
      return NextResponse.json(
        { detail: "NEXT_PUBLIC_CONTRACT_ADDRESS is not configured." },
        { status: 400 },
      );
    }

    const wallet = createServerWallet();
    const dares = await getAllDares();
    const now = Math.floor(Date.now() / 1000);

    // Find dares that are past their finalization window
    const candidates = dares.filter(
      (dare) =>
        (dare.status === "Voting" && now >= dare.votingEnd) ||
        ((dare.status === "Claimed" || dare.status === "Open") &&
          now > dare.deadline),
    );

    const finalized: Array<{ id: string; txHash: string }> = [];

    for (const dare of candidates) {
      try {
        const txHash = await finalizeDareOnChain(wallet, dare.id);
        finalized.push({ id: dare.id.toString(), txHash });
      } catch (dareError) {
        // Log individual failures without aborting the whole batch
        console.error(
          `Failed to finalize dare ${dare.id.toString()}:`,
          dareError instanceof Error ? dareError.message : dareError,
        );
      }
    }

    return NextResponse.json({ finalized, total: candidates.length });
  } catch (error) {
    const isUnauthorized =
      error instanceof Error &&
      error.message === "Unauthorized finalize request";

    return NextResponse.json(
      {
        detail:
          error instanceof Error ? error.message : "Finalize route failed.",
      },
      { status: isUnauthorized ? 401 : 500 },
    );
  }
}
