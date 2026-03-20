"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Crown, Medal, Trophy } from "lucide-react";
import AdaptiveHeader from "@/components/AdaptiveHeader";
import { ModernLeaderboardPage } from "@/components/new-look/leaderboard-page";
import { useUI } from "@/context/UIContext";
import LoadingSpinner from "@/components/LoadingSpinner";
import StarknetAddress from "@/components/StarknetAddress";
import { formatAmount } from "@/lib/config";

type Tab = "earners" | "posters" | "voted";

interface EarnerEntry {
  address: string;
  total: string;
  count: number;
}
interface PosterEntry {
  address: string;
  total: string;
  count: number;
}
interface VotedEntry {
  dareId: string;
  title: string;
  totalVotes: number;
  approveVotes: number;
  rejectVotes: number;
}

interface LeaderboardData {
  topEarners: EarnerEntry[];
  topPosters: PosterEntry[];
  topVotedDares: VotedEntry[];
}

function RankIcon({ rank }: { rank: number }) {
  if (rank === 1) return <Crown className="h-4 w-4 text-amber-300" />;
  if (rank === 2) return <Medal className="h-4 w-4 text-slate-300" />;
  if (rank === 3) return <Medal className="h-4 w-4 text-amber-600" />;
  return <span className="text-xs text-slate-500">{rank}</span>;
}

export default function LeaderboardPage() {
  const { mode } = useUI();
  if (mode === "modern") return <ModernLeaderboardPage />;

  return <ClassicLeaderboardPage />;
}

function ClassicLeaderboardPage() {
  const [tab, setTab] = useState<Tab>("earners");
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    try {
      const res = await fetch("/api/leaderboard");
      if (!res.ok) throw new Error("Failed to load leaderboard");
      const json = (await res.json()) as LeaderboardData;
      setData(json);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
    {
      key: "earners",
      label: "Top Earners",
      icon: <Trophy className="h-4 w-4" />,
    },
    {
      key: "posters",
      label: "Top Posters",
      icon: <Crown className="h-4 w-4" />,
    },
    { key: "voted", label: "Most Voted", icon: <Medal className="h-4 w-4" /> },
  ];

  return (
    <div className="min-h-screen">
      <AdaptiveHeader />

      <main className="mx-auto max-w-4xl px-4 pb-16 pt-8 sm:px-6">
        <Link
          className="inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"
          href="/"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to feed
        </Link>

        <div className="mt-6 surface-panel px-6 py-6">
          <h1 className="text-2xl font-semibold text-white">Leaderboard</h1>
          <p className="mt-2 text-sm text-slate-400">
            Top performers on Dare Board. Updates every 5 minutes.
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            {TABS.map((t) => (
              <button
                key={t.key}
                className={
                  tab === t.key
                    ? "inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950"
                    : "inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-400 transition hover:text-white"
                }
                onClick={() => setTab(t.key)}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>

          <div className="mt-6">
            {loading ? (
              <div className="flex min-h-48 items-center justify-center">
                <LoadingSpinner size="lg" text="Loading leaderboard..." />
              </div>
            ) : error ? (
              <div className="rounded-2xl border border-rose-300/20 bg-rose-300/10 px-4 py-8 text-center text-sm text-rose-100">
                {error}
              </div>
            ) : tab === "earners" ? (
              <EarnersTable data={data?.topEarners ?? []} />
            ) : tab === "posters" ? (
              <PostersTable data={data?.topPosters ?? []} />
            ) : (
              <VotedTable data={data?.topVotedDares ?? []} />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function EarnersTable({ data }: { data: EarnerEntry[] }) {
  if (data.length === 0) return <EmptyState text="No approved dares yet." />;
  return (
    <div className="space-y-2">
      {data.map((entry, i) => (
        <div
          key={entry.address}
          className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3"
        >
          <div className="flex h-8 w-8 items-center justify-center">
            <RankIcon rank={i + 1} />
          </div>
          <div className="flex-1 min-w-0">
            <StarknetAddress
              address={entry.address}
              className="text-slate-200 truncate"
            />
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-white">
              {formatAmount(entry.total)} earned
            </p>
            <p className="text-xs text-slate-500">
              {entry.count} dare{entry.count !== 1 ? "s" : ""} won
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function PostersTable({ data }: { data: PosterEntry[] }) {
  if (data.length === 0) return <EmptyState text="No dares posted yet." />;
  return (
    <div className="space-y-2">
      {data.map((entry, i) => (
        <div
          key={entry.address}
          className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3"
        >
          <div className="flex h-8 w-8 items-center justify-center">
            <RankIcon rank={i + 1} />
          </div>
          <div className="flex-1 min-w-0">
            <StarknetAddress
              address={entry.address}
              className="text-slate-200 truncate"
            />
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-white">
              {entry.count} dare{entry.count !== 1 ? "s" : ""}
            </p>
            <p className="text-xs text-slate-500">
              {formatAmount(entry.total)} total staked
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function VotedTable({ data }: { data: VotedEntry[] }) {
  if (data.length === 0) return <EmptyState text="No votes cast yet." />;
  return (
    <div className="space-y-2">
      {data.map((entry, i) => (
        <Link
          key={entry.dareId}
          href={`/dare/${entry.dareId}`}
          className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 transition hover:border-cyan-300/20 hover:bg-white/[0.06]"
        >
          <div className="flex h-8 w-8 items-center justify-center">
            <RankIcon rank={i + 1} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {entry.title}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-white">
              {entry.totalVotes} vote{entry.totalVotes !== 1 ? "s" : ""}
            </p>
            <p className="text-xs text-slate-500">
              {entry.approveVotes} approve / {entry.rejectVotes} reject
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-12 text-center">
      <p className="text-sm text-slate-400">{text}</p>
    </div>
  );
}
