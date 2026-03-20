"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Check,
  Coins,
  Copy,
  Target,
  TrendingUp,
  Trophy,
  User,
  Zap,
} from "lucide-react";
import { ModernHeader } from "./header";
import { ModernDareCard, ModernDareCardSkeleton } from "./dare-card";
import { getAvatarGradient } from "./utils";
import { useWallet } from "@/context/WalletContext";
import { getAllDares } from "@/lib/contract";
import {
  ZERO_ADDRESS,
  addressesMatch,
  formatAmount,
  getTokenDecimals,
  getTokenSymbol,
  shortAddress,
} from "@/lib/config";
import type { Dare } from "@/lib/types";

type ProfileTab = "posted" | "claimed";

export function ModernProfilePage() {
  const { wallet, walletType, connect } = useWallet();
  const [tab, setTab] = useState<ProfileTab>("posted");
  const [dares, setDares] = useState<Dare[]>([]);
  const [loading, setLoading] = useState(true);
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
      const d = await getAllDares();
      setDares(d);
    } catch {
      // silently ignore — user can refresh
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (wallet) void loadDares();
  }, [wallet, loadDares]);

  const posted = useMemo(() => {
    if (!wallet) return [];
    return dares.filter((d) => addressesMatch(d.poster, wallet.address));
  }, [dares, wallet]);

  const claimed = useMemo(() => {
    if (!wallet) return [];
    return dares.filter(
      (d) =>
        d.claimer &&
        d.claimer !== ZERO_ADDRESS &&
        addressesMatch(d.claimer, wallet.address),
    );
  }, [dares, wallet]);

  const stats = useMemo(() => {
    const won = claimed.filter((d) => d.status === "Approved");
    const totalEarned = won.reduce(
      (acc, d) =>
        acc + Number(formatAmount(d.rewardAmount, getTokenDecimals(d.rewardToken))),
      0,
    );
    return {
      daresPosted: posted.length,
      daresWon: won.length,
      totalEarned: totalEarned.toFixed(2),
      winRate:
        claimed.length > 0
          ? Math.round((won.length / claimed.length) * 100)
          : 0,
    };
  }, [posted, claimed]);

  const needsAttention = posted.filter(
    (d) => d.status === "Voting" || d.status === "Open",
  );

  // ── Not connected ──────────────────────────────────────────────────────────
  if (!wallet) {
    return (
      <div className="min-h-screen bg-background pb-20 md:pb-0">
        <ModernHeader />
        <main className="mx-auto max-w-7xl px-4 py-24 text-center lg:px-8">
          <div className="mx-auto max-w-md rounded-[2rem] border border-border bg-card p-12">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/20">
              <Zap className="h-8 w-8 text-primary" />
            </div>
            <h1 className="mb-3 text-2xl font-bold text-foreground">
              Connect your wallet
            </h1>
            <p className="mb-8 text-muted-foreground">
              View your profile, track your dare activity, and see your
              on-chain reputation.
            </p>
            <button
              onClick={() => void connect()}
              className="w-full rounded-2xl bg-primary px-6 py-3 font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              Connect Wallet
            </button>
          </div>
        </main>
      </div>
    );
  }

  // ── Connected ──────────────────────────────────────────────────────────────
  const STAT_CARDS = [
    {
      icon: <Target className="h-5 w-5" />,
      value: stats.daresPosted,
      label: "Dares Posted",
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      icon: <Trophy className="h-5 w-5" />,
      value: stats.daresWon,
      label: "Dares Won",
      color: "text-[hsl(var(--success))]",
      bg: "bg-[hsl(var(--success))]/10",
    },
    {
      icon: <Coins className="h-5 w-5" />,
      value: stats.totalEarned,
      label: "STRK Earned",
      color: "text-accent",
      bg: "bg-accent/10",
    },
    {
      icon: <TrendingUp className="h-5 w-5" />,
      value: `${stats.winRate}%`,
      label: "Win Rate",
      color: "text-[hsl(var(--warning))]",
      bg: "bg-[hsl(var(--warning))]/10",
    },
  ];

  const TABS: { id: ProfileTab; label: string; count: number }[] = [
    { id: "posted", label: "Posted Dares", count: posted.length },
    { id: "claimed", label: "Claimed Dares", count: claimed.length },
  ];

  const activeList = tab === "posted" ? posted : claimed;

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <ModernHeader />

      <main className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
        {/* ── Profile header card ─────────────────────────────────────── */}
        <div className="mb-8 rounded-[2rem] border border-border bg-card p-6 lg:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
            {/* Avatar */}
            <div
              className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl"
              style={{ background: getAvatarGradient(wallet.address) }}
            >
              <User className="h-10 w-10 text-white" />
            </div>

            {/* Address */}
            <div className="flex-1">
              <div className="mb-2 flex items-center gap-3">
                <h1 className="font-mono text-2xl font-bold text-foreground">
                  {shortAddress(wallet.address)}
                </h1>
                <button
                  onClick={copyAddress}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-muted-foreground transition-colors hover:text-foreground"
                  aria-label="Copy address"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-[hsl(var(--success))]" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {walletType && (
                  <span className="rounded-full bg-primary/20 px-3 py-1 text-xs font-medium text-primary">
                    {walletType}
                  </span>
                )}
                <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-[hsl(var(--success))]" />
                  Connected
                </span>
              </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {STAT_CARDS.map((s) => (
                <div
                  key={s.label}
                  className="rounded-2xl bg-secondary p-4 text-center"
                >
                  <div
                    className={`mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-xl ${s.bg} ${s.color}`}
                  >
                    {s.icon}
                  </div>
                  <div className="text-xl font-bold text-foreground">
                    {s.value}
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Needs attention banner ───────────────────────────────────── */}
        {needsAttention.length > 0 && (
          <div className="mb-6 rounded-2xl border border-[hsl(var(--warning))]/30 bg-[hsl(var(--warning))]/10 p-4">
            <div className="mb-3 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-[hsl(var(--warning))]" />
              <h3 className="font-semibold text-foreground">Needs Attention</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {needsAttention.map((d) => (
                <Link
                  key={d.id.toString()}
                  href={`/dare/${d.id.toString()}`}
                  className="flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-sm transition-colors hover:bg-secondary"
                >
                  <span className="max-w-[180px] truncate font-medium text-foreground">
                    {d.title}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      d.status === "Voting"
                        ? "bg-accent/20 text-accent"
                        : "bg-[hsl(var(--success))]/20 text-[hsl(var(--success))]"
                    }`}
                  >
                    {d.status}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ── Tabs ────────────────────────────────────────────────────── */}
        <div className="mb-6 flex gap-1 rounded-2xl border border-border bg-secondary p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                tab === t.id
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                  tab === t.id
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {t.count}
              </span>
            </button>
          ))}
        </div>

        {/* ── Tab content ─────────────────────────────────────────────── */}
        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <ModernDareCardSkeleton key={i} />
            ))}
          </div>
        ) : activeList.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-[2rem] border border-border bg-card p-12 text-center">
            <h3 className="mb-2 text-xl font-semibold text-foreground">
              {tab === "posted" ? "No dares posted yet" : "No dares claimed yet"}
            </h3>
            <p className="mb-6 text-muted-foreground">
              {tab === "posted"
                ? "Post your first dare and start the challenge!"
                : "Browse the feed and claim a dare to start earning!"}
            </p>
            <Link
              href={tab === "posted" ? "/create" : "/"}
              className="rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              {tab === "posted" ? "Create a Dare" : "Browse Dares"}
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {activeList.map((d) => (
              <ModernDareCard key={`${d.contractAddress ?? "c"}-${d.id.toString()}`} dare={d} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
