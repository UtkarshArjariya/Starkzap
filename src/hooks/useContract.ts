"use client";

import { useState } from "react";

import type { AppWallet } from "@/lib/starkzap";
import { useWallet } from "@/lib/starkzap";

export function useContractAction() {
  const { wallet, connect } = useWallet();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function withWallet<T>(task: (wallet: AppWallet) => Promise<T>) {
    setIsPending(true);
    setError(null);

    try {
      const activeWallet = wallet ?? (await connect());
      return await task(activeWallet);
    } catch (caughtError) {
      const message =
        caughtError instanceof Error ? caughtError.message : "Transaction failed.";
      setError(message);
      throw caughtError;
    } finally {
      setIsPending(false);
    }
  }

  return {
    wallet,
    connect,
    isPending,
    error,
    setError,
    withWallet,
  };
}
