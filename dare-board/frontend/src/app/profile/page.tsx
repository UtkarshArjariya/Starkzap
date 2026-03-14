"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FileText, Trophy, UserRound, Zap } from "lucide-react";
import DareCard from "@/components/DareCard";
import Header from "@/components/Header";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useWallet } from "@/context/WalletContext";
import { addressesMatch, shortAddress } from "@/lib/config";
import { getAllDares } from "@/lib/contract";
import type { Dare } from "@/lib/types";

export default function ProfilePage() {
  const { wallet, connect } = useWallet();
  const [tab, setTab] = useState<"posted" | "claimed">("posted");
  const [dares, setDares] = useState<Dare[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDares = useCallback(async () => {
    try {
      const nextDares = await getAllDares();
      setDares(nextDares);
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load your dares");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDares();
  }, [loadDares]);

  const posted = useMemo(() => {
    if (!wallet) {
      return [];
    }

    return dares.filter((dare) => addressesMatch(dare.poster, wallet.address));
  }, [dares, wallet]);

  const claimed = useMemo(() => {
    if (!wallet) {
      return [];
    }

    return dares.filter((dare) => dare.claimer && addressesMatch(dare.claimer, wallet.address));
  }, [dares, wallet]);

  if (!wallet) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="mx-auto max-w-4xl px-4 py-24 text-center sm:px-6">
          <div className="surface-panel px-6 py-12">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-cyan-300/20 bg-cyan-300/10">
              <UserRound className="h-7 w-7 text-cyan-200" />
            </div>
            <h1 className="mt-6 text-3xl font-semibold text-white">Connect your wallet to see your activity</h1>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              Your profile shows the dares you posted, the ones you claimed, and the reputation trail created by your on-chain activity.
            </p>
            <button
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
              onClick={() => void connect()}
            >
              <Zap className="h-4 w-4" />
              Connect wallet
            </button>
          </div>
        </main>
      </div>
    );
  }

  const visibleDares = tab === "posted" ? posted : claimed;

  return (
    <div className="min-h-screen">
      <Header />

      <main className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6">
        <section className="surface-panel px-6 py-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full border border-fuchsia-300/20 bg-fuchsia-300/10">
                <UserRound className="h-7 w-7 text-fuchsia-100" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Connected account</p>
                <p className="mt-2 font-mono text-sm text-white">{shortAddress(wallet.address)}</p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <StatCard icon={<FileText className="h-4 w-4 text-cyan-200" />} label="Dares posted" value={posted.length} />
              <StatCard icon={<Trophy className="h-4 w-4 text-amber-100" />} label="Dares claimed" value={claimed.length} />
            </div>
          </div>
        </section>

        <section className="mt-6 flex flex-wrap items-center gap-2">
          <button
            className={
              tab === "posted"
                ? "rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950"
                : "rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-400 transition hover:text-white"
            }
            onClick={() => setTab("posted")}
          >
            My dares ({posted.length})
          </button>
          <button
            className={
              tab === "claimed"
                ? "rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950"
                : "rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-400 transition hover:text-white"
            }
            onClick={() => setTab("claimed")}
          >
            My claims ({claimed.length})
          </button>
        </section>

        <section className="mt-6">
          {loading ? (
            <div className="surface-panel flex min-h-64 items-center justify-center px-6 py-12">
              <LoadingSpinner size="lg" text="Loading your activity..." />
            </div>
          ) : error ? (
            <div className="rounded-[1.75rem] border border-rose-300/20 bg-rose-300/10 px-6 py-10 text-center text-rose-50">
              <p className="text-lg font-semibold">Could not load profile data</p>
              <p className="mt-2 text-sm text-rose-100/80">{error}</p>
            </div>
          ) : visibleDares.length === 0 ? (
            <div className="surface-panel px-6 py-12 text-center">
              <p className="text-lg font-semibold text-white">
                {tab === "posted" ? "You have not posted any dares yet" : "You have not claimed any dares yet"}
              </p>
              <p className="mt-2 text-sm text-slate-400">
                {tab === "posted"
                  ? "Launch your first challenge and start building a track record."
                  : "Find an open dare on the board and take the spotlight."}
              </p>
              <Link
                className="mt-5 inline-flex items-center gap-2 rounded-full bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
                href={tab === "posted" ? "/create" : "/"}
              >
                {tab === "posted" ? "Post a dare" : "Browse the feed"}
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {visibleDares.map((dare) => (
                <DareCard dare={dare} key={dare.id.toString()} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.04] px-5 py-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-slate-500">
        {icon}
        {label}
      </div>
      <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
    </div>
  );
}
