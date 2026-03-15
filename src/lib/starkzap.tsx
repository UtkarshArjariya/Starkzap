"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { type Account, RpcProvider, WalletAccount } from "starknet";

// ── Types ────────────────────────────────────────────────────────────

/** Minimal wallet wrapper that the rest of the app talks to. */
export interface AppWallet {
  account: Account;
  address: string;
}

type WalletContextValue = {
  wallet: AppWallet | null;
  address: string | null;
  isConnecting: boolean;
  connect: () => Promise<AppWallet>;
  disconnect: () => Promise<void>;
};

// ── Provider / constants ─────────────────────────────────────────────

const RPC_URL =
  process.env.NEXT_PUBLIC_RPC_URL ?? "https://starknet-sepolia.drpc.org";

function getProvider() {
  return new RpcProvider({ nodeUrl: RPC_URL });
}

// ── Wallet discovery ─────────────────────────────────────────────────

function getAvailableWalletProviders(): any[] {
  if (typeof window === "undefined") return [];

  const providers: any[] = [];

  if ((window as any).starknet_argentX) {
    providers.push((window as any).starknet_argentX);
  }
  if ((window as any).starknet_braavos) {
    providers.push((window as any).starknet_braavos);
  }
  // fallback
  if (
    (window as any).starknet &&
    !providers.includes((window as any).starknet)
  ) {
    providers.push((window as any).starknet);
  }

  return providers;
}

async function connectStarknetWallet(): Promise<AppWallet> {
  const walletProviders = getAvailableWalletProviders();

  if (walletProviders.length === 0) {
    throw new Error(
      "No Starknet wallet found. Please install Argent X or Braavos browser extension."
    );
  }

  // Prefer ArgentX, then Braavos, then whatever is available
  const walletProvider = walletProviders[0];

  // Use starknet.js WalletAccount.connect() — the official way to connect
  // browser wallet extensions. It handles enable(), address retrieval, and signing.
  const provider = getProvider();
  const walletAccount = await WalletAccount.connect(
    provider,
    walletProvider,
    undefined, // cairoVersion — auto-detect
    undefined, // paymaster
    false      // silentMode = false → show the wallet popup
  );

  const address = walletAccount.address;

  if (!address) {
    throw new Error("Could not retrieve wallet address. Please try again.");
  }

  return {
    account: walletAccount as unknown as Account,
    address,
  };
}

// ── React context ────────────────────────────────────────────────────

const WalletContext = createContext<WalletContextValue | null>(null);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [wallet, setWallet] = useState<AppWallet | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    try {
      const connectedWallet = await connectStarknetWallet();
      setWallet(connectedWallet);
      return connectedWallet;
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    setWallet(null);
  }, []);

  const value = useMemo<WalletContextValue>(
    () => ({
      wallet,
      address: wallet?.address ?? null,
      isConnecting,
      connect,
      disconnect,
    }),
    [wallet, isConnecting, connect, disconnect]
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWallet must be used within WalletProvider.");
  }
  return context;
}
