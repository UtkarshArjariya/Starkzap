"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Copy, ExternalLink, FileText, Trophy, UserRound, Zap } from "lucide-react";
import DareCard from "@/components/DareCard";
import Header from "@/components/Header";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useWallet } from "@/context/WalletContext";
import StarknetAddress from "@/components/StarknetAddress";
import { STARKSCAN_URL, ZERO_ADDRESS, addressesMatch, formatAmount, getTokenDecimals, getTokenSymbol } from "@/lib/config";
import { getAllDares } from "@/lib/contract";
import type { Dare } from "@/lib/types";

export default function ProfilePage() {
  const { wallet, walletType, connect } = useWallet();
  const [tab, setTab] = useState<"posted" | "claimed" | "activity">("posted");
  const [dares, setDares] = useState<Dare[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const copyAddress = useCallback(() => {
    if (!wallet) return;
    void navigator.clipboard.writeText(wallet.address).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [wallet]);

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

  // Activity: derive from dare data where user is poster or claimer
  const activity = useMemo(() => {
    if (!wallet) return [];
    const events: Array<{ type: string; description: string; dare: Dare; timestamp: number }> = [];
    for (const d of dares) {
      const isPoster = addressesMatch(d.poster, wallet.address);
      const isClaimer = d.claimer && d.claimer !== ZERO_ADDRESS && addressesMatch(d.claimer, wallet.address);
      if (isPoster) {
        events.push({ type: "created", description: `Posted "${d.title}" \u2014 ${formatAmount(d.rewardAmount, getTokenDecimals(d.rewardToken))} ${getTokenSymbol(d.rewardToken)} at stake`, dare: d, timestamp: d.deadline - 86400 });
      }
      if (isClaimer) {
        events.push({ type: "claimed", description: `Claimed "${d.title}"`, dare: d, timestamp: d.deadline - 43200 });
      }
      if (isClaimer && d.proofSubmittedAt > 0) {
        events.push({ type: "proof", description: `Submitted proof for "${d.title}"`, dare: d, timestamp: d.proofSubmittedAt });
      }
      if (isClaimer && d.status === "Approved") {
        events.push({ type: "won", description: `Won ${formatAmount(d.rewardAmount, getTokenDecimals(d.rewardToken))} ${getTokenSymbol(d.rewardToken)} on "${d.title}"`, dare: d, timestamp: d.votingEnd });
      }
      if (isPoster && (d.status as string) === "Cancelled") {
        events.push({ type: "cancelled", description: `Cancelled "${d.title}" \u2014 reward returned`, dare: d, timestamp: d.deadline });
      }
    }
    return events.sort((a, b) => b.timestamp - a.timestamp).slice(0, 20);
  }, [dares, wallet]);

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
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
                  Connected account {walletType === "privy" ? "(Privy)" : walletType === "cartridge" ? "(Cartridge)" : ""}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <StarknetAddress address={wallet.address} className="text-white" />
                  <button
                    className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-400 transition hover:text-white hover:bg-white/10"
                    onClick={copyAddress}
                    title="Copy address"
                  >
                    {copied ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
                {walletType === "privy" ? (
                  <p className="mt-2 text-xs text-amber-200/80">
                    This is a Privy-managed wallet. To post dares, send STRK tokens to this address first. The paymaster only covers gas fees.
                  </p>
                ) : null}
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
          <button
            className={
              tab === "activity"
                ? "rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950"
                : "rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-400 transition hover:text-white"
            }
            onClick={() => setTab("activity")}
          >
            Activity ({activity.length})
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
          ) : tab === "activity" ? (
            activity.length === 0 ? (
              <div className="surface-panel px-6 py-12 text-center">
                <p className="text-lg font-semibold text-white">No activity yet</p>
                <p className="mt-2 text-sm text-slate-400">Post or claim a dare to start building your on-chain history.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activity.map((event, i) => (
                  <Link
                    key={`${event.dare.id}-${event.type}-${i}`}
                    href={`/dare/${event.dare.id.toString()}`}
                    className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 transition hover:border-cyan-300/20 hover:bg-white/[0.06]"
                  >
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/5 text-sm">
                      {event.type === "created" ? "\u{1F4DD}" : event.type === "claimed" ? "\u{26A1}" : event.type === "proof" ? "\u{1F4F8}" : event.type === "won" ? "\u{1F3C6}" : "\u{21A9}\u{FE0F}"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-200">{event.description}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {event.timestamp > 0 ? new Date(event.timestamp * 1000).toLocaleDateString() : ""}
                      </p>
                    </div>
                    <ExternalLink className="mt-1 h-3.5 w-3.5 shrink-0 text-slate-500" />
                  </Link>
                ))}
              </div>
            )
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
