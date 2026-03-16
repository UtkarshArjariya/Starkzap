"use client";

import { getStarknet } from "@starknet-io/get-starknet-core";
import {
  WalletAccount as StarknetWalletAccount,
  Account,
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

function makeWallet(
  address: string,
  execute: (calls: WalletCall[]) => Promise<{ transaction_hash: string }>,
  starknet?: unknown,
): WalletAccount {
  return { address, execute, starknet };
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

    return makeWallet(
      address,
      async (calls) => {
        const result = await walletAccount!.execute(calls as never);
        return { transaction_hash: result.transaction_hash };
      },
      authorizedWallet,
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

export async function connectWithPrivateKey(
  address: string,
  privateKey: string,
): Promise<WalletAccount> {
  if (!address || !privateKey) {
    throw new Error("Address and private key are required.");
  }

  const provider = new RpcProvider({ nodeUrl: RPC_URL });
  const account = new Account(provider, address, privateKey);

  return makeWallet(address, async (calls) => {
    const result = await account.execute(calls as never);
    return { transaction_hash: result.transaction_hash };
  });
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

    return makeWallet(
      address,
      async (calls) => {
        const result = await walletAccount!.execute(calls as never);
        return { transaction_hash: result.transaction_hash };
      },
      lastWallet,
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
