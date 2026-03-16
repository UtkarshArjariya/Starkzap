"use client";

import { getStarknet } from "@starknet-io/get-starknet-core";
import {
  WalletAccount as StarknetWalletAccount,
  RpcProvider,
} from "starknet";
import type { StarknetWindowObject } from "@starknet-io/types-js";
import { RPC_URL } from "@/lib/config";
import type { InstalledWallet, WalletAccount, WalletCall } from "@/lib/types";

// Only Argent X and Braavos are officially supported
const SUPPORTED_WALLET_IDS = ["braavos", "argentx", "argent"];

function isSupported(wallet: StarknetWindowObject): boolean {
  const id = (wallet.id ?? "").toLowerCase();
  return SUPPORTED_WALLET_IDS.some((supported) => id.includes(supported));
}

/**
 * Normalize a calldata value to a hex string.
 * Wallet extensions (Argent X / Braavos) may reject non-hex/non-decimal values
 * that starknet.js CallData.compile() sometimes produces (e.g. BigInt objects
 * or oddly-formatted strings for ByteArray chunks).
 */
function normalizeCalldataValue(v: unknown): string {
  if (typeof v === "bigint") return "0x" + v.toString(16);
  if (typeof v === "number") return "0x" + BigInt(v).toString(16);
  if (typeof v === "string") {
    // Already a hex string → pass through
    if (/^0x[0-9a-fA-F]+$/.test(v)) return v;
    // Decimal string → convert to hex for consistency
    if (/^\d+$/.test(v)) return "0x" + BigInt(v).toString(16);
    // Otherwise return as-is (short strings, etc.)
    return v;
  }
  return String(v);
}

function makeWallet(
  address: string,
  execute: (calls: WalletCall[]) => Promise<{ transaction_hash: string }>,
  starknet?: unknown,
  chainId?: string,
): WalletAccount {
  // Wrap execute to normalize calldata before sending to wallet extension
  const safeExecute = (calls: WalletCall[]) => {
    const normalized = calls.map((call) => ({
      ...call,
      calldata: Array.isArray(call.calldata)
        ? call.calldata.map(normalizeCalldataValue)
        : call.calldata,
    }));
    return execute(normalized);
  };
  return { address, execute: safeExecute, starknet, chainId };
}

async function getWalletChainId(
  wallet: StarknetWindowObject,
): Promise<string | undefined> {
  try {
    const result = await (
      wallet as unknown as {
        request: (args: { type: string }) => Promise<string>;
      }
    ).request({ type: "wallet_requestChainId" });
    return result || undefined;
  } catch {
    return undefined;
  }
}

// ─── Public helpers ──────────────────────────────────────────────────────────

export async function getInstalledWallets(): Promise<InstalledWallet[]> {
  try {
    const starknet = getStarknet({ windowObject: window });
    const wallets = await starknet.getAvailableWallets().catch(() => []);
    return wallets.filter(isSupported) as unknown as InstalledWallet[];
  } catch {
    return [];
  }
}

export async function connectExtensionWallet(
  walletObject: InstalledWallet,
): Promise<WalletAccount> {
  const starknet = getStarknet({ windowObject: window });

  try {
    // Step 1: Authorize the wallet and persist the last-connected wallet in
    //         localStorage so getConnectedWallet() can silently reconnect later.
    //         In get-starknet-core v4 enable() accepts RequestAccountsParameters
    //         ({ silent_mode?: boolean }) and returns the StarknetWindowObject.
    const authorizedWallet = await starknet.enable(
      walletObject as unknown as StarknetWindowObject,
    );

    if (!authorizedWallet) {
      throw new Error("Wallet authorization failed. Please try again.");
    }

    // Step 2: Use the starknet.js v6 WalletAccount API to get the active
    //         address.  connectSilent uses wallet_requestAccounts with
    //         silent_mode: true – no extra popup since we just authorised.
    const provider = new RpcProvider({ nodeUrl: RPC_URL });

    let walletAccount: StarknetWalletAccount | null = null;

    try {
      walletAccount = await StarknetWalletAccount.connectSilent(
        provider,
        // StarknetWindowObject is structurally compatible with
        // StarknetWalletProvider – cast to satisfy TypeScript.
        authorizedWallet as unknown as Parameters<
          typeof StarknetWalletAccount.connectSilent
        >[1],
      );
    } catch {
      // Silent connect can fail if the wallet needs explicit account selection
      // (e.g. first-time use). Fall through to the non-silent path.
    }

    // If silent connect didn't return an address, request accounts explicitly.
    if (!walletAccount?.address) {
      walletAccount = await StarknetWalletAccount.connect(
        provider,
        authorizedWallet as unknown as Parameters<
          typeof StarknetWalletAccount.connect
        >[1],
      );
    }

    const address = walletAccount?.address;

    if (!address) {
      throw new Error(
        "No accounts found. Please create an account inside your wallet extension first.",
      );
    }

    const chainId = await getWalletChainId(
      authorizedWallet as unknown as StarknetWindowObject,
    );

    return makeWallet(
      address,
      async (calls) => {
        const result = await walletAccount!.execute(calls as never);
        return { transaction_hash: result.transaction_hash };
      },
      authorizedWallet,
      chainId,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (/user.*rejected|user.*cancelled|user.*denied|refused/i.test(message)) {
      throw new Error(
        "Connection rejected. Please approve the connection request in your wallet.",
      );
    }

    if (/key.?ring|no accounts/i.test(message)) {
      throw new Error(
        "Your wallet has no accounts yet. Open the extension and create an account first.",
      );
    }

    if (/trpc|internal server/i.test(message)) {
      throw new Error(
        "Wallet extension error. Try reloading the extension or your browser.",
      );
    }

    throw new Error(message || "Failed to connect wallet.");
  }
}

export async function getConnectedWallet(): Promise<WalletAccount | null> {
  try {
    const starknet = getStarknet({ windowObject: window });
    const lastWallet = await starknet
      .getLastConnectedWallet()
      .catch(() => null);

    if (!lastWallet) {
      return null;
    }

    const provider = new RpcProvider({ nodeUrl: RPC_URL });

    const walletAccount = await StarknetWalletAccount.connectSilent(
      provider,
      lastWallet as unknown as Parameters<
        typeof StarknetWalletAccount.connectSilent
      >[1],
    ).catch(() => null);

    const address = walletAccount?.address;

    if (!address) {
      return null;
    }

    const chainId = await getWalletChainId(
      lastWallet as unknown as StarknetWindowObject,
    );

    return makeWallet(
      address,
      async (calls) => {
        const result = await walletAccount!.execute(calls as never);
        return { transaction_hash: result.transaction_hash };
      },
      lastWallet,
      chainId,
    );
  } catch {
    return null;
  }
}

export async function disconnectWallet(): Promise<void> {
  try {
    const starknet = getStarknet({ windowObject: window });
    await starknet.disconnect({ clearLastWallet: true });
  } catch {
    // Ignore disconnect errors – the UI state is cleared regardless.
  }
}
