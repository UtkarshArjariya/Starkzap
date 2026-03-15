"use client";

import { useEffect, useState } from "react";

import { parseApiDarePayload } from "@/lib/contract";
import type { Dare } from "@/lib/types";

type UseDaresResult = {
  dares: Dare[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

export function useDares(voterAddress?: string | null): UseDaresResult {
  const [dares, setDares] = useState<Dare[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setError(null);
      const search = new URLSearchParams();
      if (voterAddress) {
        search.set("voter", voterAddress);
      }
      const response = await fetch(`/api/dares?${search.toString()}`, {
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error("Failed to load dares.");
      }

      const payload = (await response.json()) as { dares: Record<string, unknown>[] };
      setDares(payload.dares.map(parseApiDarePayload));
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void load();
    const interval = setInterval(() => {
      void load();
    }, 15000);

    return () => clearInterval(interval);
  }, [voterAddress]);

  return { dares, isLoading, error, refresh: load };
}
