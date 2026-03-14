"use client";

import { getStarknet } from "@starknet-io/get-starknet-core";
import { Account, RpcProvider } from "starknet";
import { RPC_URL } from "@/lib/config";
import type { InstalledWallet, WalletAccount, WalletCall } from "@/lib/types";

const STARKNET_WALLET_IDS = ["braavos", "argentx", "argent"];

function makeWallet(address: string, execute: (calls: WalletCall[]) => Promise<{ transaction_hash: string }>, starknet?: unknown): WalletAccount {
  return {
    address,
    execute,
    starknet,
  };
}

export async function getInstalledWallets(): Promise<InstalledWallet[]> {
  try {
    const starknet = getStarknet({ windowObject: window });
    const wallets = (await starknet.getAvailableWallets().catch(() => [])) as InstalledWallet[];

    return (wallets || []).filter((wallet) => {
      const id = wallet.id?.toLowerCase() || "";
      return STARKNET_WALLET_IDS.some((supportedId) => id.includes(supportedId));
    });
  } catch {
    return [];
  }
}

export async function connectExtensionWallet(walletObject: InstalledWallet): Promise<WalletAccount> {
  const starknet = getStarknet({ windowObject: window });

  try {
    const enabled = (await starknet.enable(walletObject as never, {
      starknetVersion: "v5",
    } as never)) as {
      selectedAddress?: string;
      account?: { address?: string; execute: (calls: unknown) => Promise<{ transaction_hash: string }> };
    };
    const address = enabled?.selectedAddress || enabled?.account?.address;
    const account = enabled?.account;

    if (!address || !account) {
      throw new Error("Wallet connected without returning an address");
    }

    return makeWallet(
      address,
      async (calls) => {
        const result = await account.execute(calls as never);
        return { transaction_hash: result.transaction_hash };
      },
      enabled,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (/key ring/i.test(message)) {
      throw new Error("Wallet has no accounts yet. Create one inside the extension first.");
    }

    if (/trpc|internal server/i.test(message)) {
      throw new Error("Wallet extension error. Reload the extension or try the direct key flow.");
    }

    throw new Error(message || "Failed to connect wallet extension");
  }
}

export async function connectWithPrivateKey(address: string, privateKey: string): Promise<WalletAccount> {
  if (!address || !privateKey) {
    throw new Error("Address and private key are required");
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
    const lastWallet = await starknet.getLastConnectedWallet().catch(() => null);

    if (!lastWallet) {
      return null;
    }

    const enabled = (await starknet
      .enable(lastWallet as never, { starknetVersion: "v5" } as never)
      .catch(() => null)) as
      | {
          selectedAddress?: string;
          account?: { address?: string; execute: (calls: unknown) => Promise<{ transaction_hash: string }> };
        }
      | null;
    const address = enabled?.selectedAddress || enabled?.account?.address;
    const account = enabled?.account;

    if (!enabled || !address || !account) {
      return null;
    }

    return makeWallet(
      address,
      async (calls) => {
        const result = await account.execute(calls as never);
        return { transaction_hash: result.transaction_hash };
      },
      enabled,
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
    // ignore wallet disconnect errors
  }
}
