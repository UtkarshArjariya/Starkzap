"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FlaskConical, Plus, Sparkles, Zap } from "lucide-react";
import DareCard from "@/components/DareCard";
import Header from "@/components/Header";
import LoadingSpinner from "@/components/LoadingSpinner";
import { getAllDares } from "@/lib/contract";
import { IS_DEMO_MODE } from "@/lib/config";
import type { Dare, DareStatus } from "@/lib/types";

const FILTERS: Array<DareStatus | "All"> = [
  "All",
  "Open",
  "Claimed",
  "Voting",
  "Approved",
  "Rejected",
  "Expired",
];

export default function FeedPage() {
  const [dares, setDares] = useState<Dare[]>([]);
  const [filter, setFilter] = useState<DareStatus | "All">("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDares = useCallback(async () => {
    try {
      const nextDares = await getAllDares();
      setDares(nextDares);
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load dares");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDares();
    const interval = window.setInterval(() => void loadDares(), 15000);

    return () => window.clearInterval(interval);
  }, [loadDares]);

  const filteredDares = useMemo(() => {
    if (filter === "All") {
      return dares;
    }

    return dares.filter((dare) => dare.status === filter);
  }, [dares, filter]);

  return (
    <div className="min-h-screen">
      <Header />

      <main className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6">
        <section className="surface-panel relative overflow-hidden px-6 py-8 sm:px-8 sm:py-10">
          <div className="absolute inset-0 bg-hero-mesh opacity-90" />
          <div className="absolute -right-14 top-0 h-40 w-40 rounded-full bg-cyan-300/10 blur-3xl" />
          <div className="absolute -bottom-20 left-0 h-52 w-52 rounded-full bg-fuchsia-300/10 blur-3xl" />

          <div className="relative z-10 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs uppercase tracking-[0.22em] text-cyan-100">
                <Sparkles className="h-3.5 w-3.5" />
                On-chain social challenges
              </div>
              <h1 className="mt-5 max-w-xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                Turn internet dares into transparent Starknet bounties.
              </h1>
              <p className="mt-4 max-w-xl text-base leading-7 text-slate-300 sm:text-lg">
                Post a public challenge, lock the reward on-chain, and let the community verify the proof. No moderators, no spreadsheets, no hidden payout logic.
              </p>
              <div className="mt-6 flex flex-wrap gap-3 text-sm text-slate-300">
                <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2">
                  <span className="font-semibold text-white">{dares.length}</span> total dares
                </div>
                <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2">
                  <span className="font-semibold text-white">{dares.filter((dare) => dare.status === "Voting").length}</span> under review
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                className="inline-flex items-center justify-center gap-2 rounded-full bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
                href="/create"
              >
                <Plus className="h-4 w-4" />
                Post a dare
              </Link>
              <a
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/10"
                href="https://sepolia.starkscan.co"
                rel="noreferrer"
                target="_blank"
              >
                <Zap className="h-4 w-4 text-cyan-200" />
                Explore Starkscan
              </a>
            </div>
          </div>
        </section>

        {IS_DEMO_MODE ? (
          <div className="mt-5 rounded-[1.5rem] border border-amber-200/15 bg-amber-200/10 px-5 py-4 text-sm text-amber-50">
            <div className="flex items-start gap-3">
              <FlaskConical className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                Preview mode is active. The feed is using seeded demo dares until you add `NEXT_PUBLIC_CONTRACT_ADDRESS` to `frontend/.env.local`.
              </p>
            </div>
          </div>
        ) : null}

        <section className="mt-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((tab) => (
              <button
                key={tab}
                className={
                  filter === tab
                    ? "rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950"
                    : "rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-400 transition hover:border-cyan-300/20 hover:text-white"
                }
                onClick={() => setFilter(tab)}
              >
                {tab}
              </button>
            ))}
          </div>

          <p className="text-sm text-slate-500">
            Feed refreshes every 15 seconds so newly created or finalized dares show up without a hard refresh.
          </p>
        </section>

        <section className="mt-6">
          {loading ? (
            <div className="surface-panel flex min-h-80 items-center justify-center px-6 py-16">
              <LoadingSpinner size="lg" text="Loading dares from Starknet..." />
            </div>
          ) : error ? (
            <div className="rounded-[1.75rem] border border-rose-300/20 bg-rose-300/10 px-6 py-10 text-center text-rose-50">
              <p className="text-lg font-semibold">Could not load the dare board</p>
              <p className="mt-2 text-sm text-rose-100/80">{error}</p>
            </div>
          ) : filteredDares.length === 0 ? (
            <div className="surface-panel px-6 py-12 text-center">
              <p className="text-lg font-semibold text-white">
                {filter === "All" ? "No dares yet" : `No ${filter.toLowerCase()} dares right now`}
              </p>
              <p className="mt-2 text-sm text-slate-400">
                {filter === "All"
                  ? "Be the first to set the tone and lock a reward."
                  : "Try another filter or post a fresh challenge."}
              </p>
              <Link
                className="mt-5 inline-flex items-center gap-2 rounded-full bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
                href="/create"
              >
                <Plus className="h-4 w-4" />
                Post the first dare
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {filteredDares.map((dare) => (
                <DareCard dare={dare} key={dare.id.toString()} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
