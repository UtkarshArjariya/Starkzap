"use client";

import { useEffect, useState } from "react";

import { parseApiDarePayload } from "@/lib/contract";
import type { Dare } from "@/lib/types";

type UseDareResult = {
  dare: Dare | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

export function useDare(id: string | undefined, voterAddress?: string | null): UseDareResult {
  const [dare, setDare] = useState<Dare | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!id) {
      return;
    }

    try {
      setError(null);
      const search = new URLSearchParams();
      if (voterAddress) {
        search.set("voter", voterAddress);
      }

      const response = await fetch(`/api/dare/${id}?${search.toString()}`, {
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error("Failed to load dare.");
      }

      const payload = (await response.json()) as { dare: Record<string, unknown> };
      setDare(parseApiDarePayload(payload.dare));
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (!id) {
      return;
    }

    void load();
    const interval = setInterval(() => {
      void load();
    }, 10000);

    return () => clearInterval(interval);
  }, [id, voterAddress]);

  return { dare, isLoading, error, refresh: load };
}
