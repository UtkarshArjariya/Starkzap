"use client";

import { getStarknet } from "@starknet-io/get-starknet-core";
import {
  WalletAccount as StarknetWalletAccount,
  RpcProvider,
} from "starknet";
import type { StarknetWindowObject } from "@starknet-io/types-js";
import { RPC_URL, STARKNET_NETWORK } from "@/lib/config";
import type { InstalledWallet, WalletAccount, WalletCall } from "@/lib/types";
import {
  StarkZap,
  sepoliaTokens,
  mainnetTokens,
  fromAddress,
  Amount,
  OnboardStrategy,
} from "starkzap";
import type { WalletInterface } from "starkzap";

// ─── StarkZap SDK ────────────────────────────────────────────────────────────

const network = (STARKNET_NETWORK ?? "sepolia") as "sepolia" | "mainnet";

/** AVNU paymaster URL per network (server-side direct, client-side via proxy) */
const paymasterNodeUrl =
  typeof window !== "undefined"
    ? "/api/paymaster" // Client-side: use server proxy to hide API key
    : network === "mainnet"
      ? "https://starknet.paymaster.avnu.fi"
      : "https://sepolia.paymaster.avnu.fi";

/** Initialize StarkZap SDK with AVNU paymaster for gasless transactions */
export const starkzapSdk = new StarkZap({
  network,
  paymaster: {
    nodeUrl: paymasterNodeUrl,
    // API key is only needed server-side (direct calls). Client-side calls go
    // through /api/paymaster which injects the key on the server.
    ...(typeof window === "undefined"
      ? { apiKey: process.env.AVNU_API_KEY || undefined }
      : {}),
  },
});

/** Token presets from StarkZap for the current network */
export const STARKZAP_TOKENS = network === "mainnet" ? mainnetTokens : sepoliaTokens;

export { fromAddress, Amount, OnboardStrategy };

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

    // Note: Extension wallets (Argent X / Braavos) CANNOT use the AVNU
    // paymaster for gasless transactions. The AVNU paymaster flow requires
    // co-signing the transaction before the user's wallet signs it, which
    // means the paymaster must see and sign the raw transaction payload first.
    // Extension wallets sign internally inside the browser extension and never
    // expose the unsigned transaction for external co-signing — the key never
    // leaves the extension. Gasless transactions are therefore only possible
    // for Privy embedded wallets (where we hold a server-side signer) and
    // Cartridge Controller (which has a built-in paymaster via its policies).
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

// ─── Cartridge Controller (via StarkZap) ────────────────────────────────────

let cartridgeWalletRef: WalletInterface | null = null;

export async function connectCartridgeWallet(): Promise<WalletAccount> {
  const CONTRACT = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS!;

  // Cartridge Controller has built-in paymaster — all transactions matching
  // policies are automatically sponsored. No need to specify feeMode.
  const wallet = await starkzapSdk.connectCartridge({
    policies: [
      { target: CONTRACT, method: "create_dare" },
      { target: CONTRACT, method: "claim_dare" },
      { target: CONTRACT, method: "submit_proof" },
      { target: CONTRACT, method: "cast_vote" },
      { target: CONTRACT, method: "finalize_dare" },
      { target: CONTRACT, method: "cancel_dare" },
    ],
  });

  cartridgeWalletRef = wallet;

  return makeWallet(
    wallet.address as string,
    async (calls) => {
      const tx = await wallet.execute(
        calls.map((c) => ({
          contractAddress: c.contractAddress,
          entrypoint: c.entrypoint,
          calldata: c.calldata as string[],
        })),
      );
      await tx.wait();
      return { transaction_hash: tx.hash };
    },
    undefined, // no starknet window object
    wallet.getChainId().toFelt252(),
  );
}

export async function disconnectCartridgeWallet(): Promise<void> {
  if (cartridgeWalletRef) {
    await cartridgeWalletRef.disconnect();
    cartridgeWalletRef = null;
  }
}

// ─── Privy (via StarkZap) ────────────────────────────────────────────────────

let privyWalletRef: WalletInterface | null = null;

/**
 * Connect a Privy-managed Starknet wallet via StarkZap's onboard flow.
 * The caller must provide `getAccessToken` from Privy's React hook.
 */
export async function connectPrivyWallet(
  getAccessToken: () => Promise<string | null>,
): Promise<WalletAccount> {
  const accessToken = await getAccessToken();
  if (!accessToken) throw new Error("Not authenticated with Privy");

  // Resolve wallet from our server
  const res = await fetch("/api/wallet/privy", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to resolve wallet" }));
    throw new Error(err.error || "Failed to resolve Privy wallet");
  }
  const { walletId, publicKey } = await res.json();

  // Use StarkZap onboard with privy strategy
  const result = await starkzapSdk.onboard({
    strategy: OnboardStrategy.Privy,
    privy: {
      resolve: async () => ({
        walletId,
        publicKey,
        serverUrl: "/api/wallet/sign",
        headers: () => ({
          Authorization: `Bearer ${accessToken}`,
        }),
      }),
    },
    accountPreset: "argentXV050",
    deploy: "if_needed",
    feeMode: "sponsored",
  });

  const wallet = result.wallet;
  privyWalletRef = wallet;

  return makeWallet(
    wallet.address as string,
    async (calls) => {
      const tx = await wallet.execute(
        calls.map((c) => ({
          contractAddress: c.contractAddress,
          entrypoint: c.entrypoint,
          calldata: c.calldata as string[],
        })),
        { feeMode: "sponsored" },
      );
      await tx.wait();
      return { transaction_hash: tx.hash };
    },
    undefined,
    wallet.getChainId().toFelt252(),
  );
}

export async function disconnectPrivyWallet(): Promise<void> {
  if (privyWalletRef) {
    await privyWalletRef.disconnect();
    privyWalletRef = null;
  }
}

