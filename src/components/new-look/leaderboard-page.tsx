"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Coins, Crown, Loader2, Medal, Trophy, User, Users } from "lucide-react";
import { ModernHeader } from "./header";

interface EarnerEntry { address: string; total: string; count: number }
interface PosterEntry { address: string; total: string; count: number }
interface VotedEntry { dareId: string; title: string; totalVotes: number; approveVotes: number; rejectVotes: number }

interface LeaderboardData {
  topEarners: EarnerEntry[];
  topPosters: PosterEntry[];
  topVotedDares: VotedEntry[];
}

type Tab = "earners" | "posters" | "voted";

type ListEntry = {
  rank: number;
  key: string;
  primary: string;
  secondary: string;
  value: string;
  href?: string;
  isAddress: boolean;
};

function truncateAddress(address: string) {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function getAvatarGradient(seed: string) {
  const hash = seed.replace(/^0x/, "").padStart(8, "0");
  const hue1 = parseInt(hash.slice(0, 2), 16) % 360;
  const hue2 = (hue1 + 60) % 360;
  return `linear-gradient(135deg, hsl(${hue1}, 65%, 52%), hsl(${hue2}, 65%, 52%))`;
}

const PODIUM_STYLE = {
  1: {
    bg: "from-yellow-500/20 to-amber-500/20",
    border: "border-yellow-500/40",
    iconColor: "text-yellow-400",
    ringColor: "ring-yellow-400/30",
    avatarSize: "h-16 w-16",
    iconSize: "h-8 w-8",
    rankIconSize: "h-9 w-9",
    valueSize: "text-2xl",
    order: "order-first lg:order-none",
    icon: Crown,
  },
  2: {
    bg: "from-slate-300/15 to-slate-400/15",
    border: "border-slate-400/40",
    iconColor: "text-slate-300",
    ringColor: "",
    avatarSize: "h-13 w-13",
    iconSize: "h-6 w-6",
    rankIconSize: "h-8 w-8",
    valueSize: "text-xl",
    order: "",
    icon: Medal,
  },
  3: {
    bg: "from-amber-700/15 to-orange-600/15",
    border: "border-amber-700/40",
    iconColor: "text-amber-600",
    ringColor: "",
    avatarSize: "h-12 w-12",
    iconSize: "h-5 w-5",
    rankIconSize: "h-7 w-7",
    valueSize: "text-lg",
    order: "",
    icon: Medal,
  },
} as const;

function PodiumCard({
  entry,
  rank,
}: {
  entry: ListEntry;
  rank: 1 | 2 | 3;
}) {
  const style = PODIUM_STYLE[rank];
  const Icon = style.icon;

  return (
    <div
      className={`flex flex-col items-center justify-end rounded-2xl border bg-gradient-to-b p-5 text-center ${style.bg} ${style.border}`}
    >
      <Icon className={`mb-3 ${style.rankIconSize} ${style.iconColor}`} />
      <div
        className={`mb-3 flex items-center justify-center rounded-xl ${style.avatarSize} ${rank === 1 ? `ring-4 ${style.ringColor}` : ""}`}
        style={entry.isAddress ? { background: getAvatarGradient(entry.key) } : { background: "hsl(var(--secondary))" }}
      >
        <User className={`${style.iconSize} text-white`} />
      </div>
      <p className="mb-1 max-w-full truncate text-sm font-semibold text-foreground">
        {entry.primary}
      </p>
      <p className={`font-bold text-foreground ${style.valueSize}`}>{entry.value}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{entry.secondary}</p>
    </div>
  );
}

function buildList(data: LeaderboardData, tab: Tab): ListEntry[] {
  if (tab === "earners") {
    return data.topEarners.map((e, i) => ({
      rank: i + 1,
      key: e.address,
      primary: truncateAddress(e.address),
      secondary: `${e.count} dare${e.count !== 1 ? "s" : ""} won`,
      value: `${Number(e.total).toLocaleString()} STRK`,
      isAddress: true,
    }));
  }
  if (tab === "posters") {
    return data.topPosters.map((e, i) => ({
      rank: i + 1,
      key: e.address,
      primary: truncateAddress(e.address),
      secondary: `${e.count} dare${e.count !== 1 ? "s" : ""} posted`,
      value: `${Number(e.total).toLocaleString()} STRK staked`,
      isAddress: true,
    }));
  }
  return data.topVotedDares.map((e, i) => ({
    rank: i + 1,
    key: e.dareId,
    primary: e.title,
    secondary: `${e.approveVotes} approve · ${e.rejectVotes} reject`,
    value: `${e.totalVotes} votes`,
    href: `/dare/${e.dareId}`,
    isAddress: false,
  }));
}

export function ModernLeaderboardPage() {
  const [tab, setTab] = useState<Tab>("earners");
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/leaderboard");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as LeaderboardData;
      setData(json);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load leaderboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const list = data ? buildList(data, tab) : [];
  const top3 = list.slice(0, 3) as [ListEntry, ListEntry, ListEntry] | [];
  const rest = list.slice(3);

  const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "earners", label: "Top Earners", icon: <Coins className="h-4 w-4" /> },
    { key: "posters", label: "Top Posters", icon: <Trophy className="h-4 w-4" /> },
    { key: "voted", label: "Most Voted", icon: <Users className="h-4 w-4" /> },
  ];

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <ModernHeader />

      <main className="mx-auto max-w-5xl px-4 py-8 lg:px-8">
        {/* Page title */}
        <div className="mb-8">
          <h1 className="mb-1 text-3xl font-bold tracking-tight text-foreground">Leaderboard</h1>
          <p className="text-muted-foreground">The top performers in the community</p>
        </div>

        {/* Tabs */}
        <div className="mb-8 flex gap-1 rounded-2xl border border-border bg-secondary p-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                tab === t.key
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.icon}
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-border bg-card p-12 text-center">
            <p className="mb-2 text-lg font-semibold text-foreground">Failed to load leaderboard</p>
            <p className="mb-6 text-sm text-muted-foreground">{error}</p>
            <button
              onClick={() => void loadData()}
              className="rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              Retry
            </button>
          </div>
        ) : list.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-12 text-center">
            <p className="text-lg font-semibold text-foreground">No data yet</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Be the first to make the leaderboard!
            </p>
            <Link
              href="/"
              className="mt-6 inline-block rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              Browse Dares
            </Link>
          </div>
        ) : (
          <>
            {/* Podium — top 3 */}
            {top3.length === 3 && (
              <div className="mb-8 grid grid-cols-3 gap-3 sm:gap-4">
                {/* Display order: 2nd | 1st | 3rd */}
                <PodiumCard entry={top3[1]} rank={2} />
                <PodiumCard entry={top3[0]} rank={1} />
                <PodiumCard entry={top3[2]} rank={3} />
              </div>
            )}

            {/* Rest of list (ranks 4+) */}
            {rest.length > 0 && (
              <div className="overflow-hidden rounded-2xl border border-border bg-card">
                <div className="divide-y divide-border">
                  {rest.map((entry) => {
                    const inner = (
                      <div className="flex items-center gap-4 p-4 transition-colors hover:bg-secondary/50">
                        {/* Rank */}
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-sm font-bold text-muted-foreground">
                          {entry.rank}
                        </div>

                        {/* Avatar (address entries only) */}
                        {entry.isAddress && (
                          <div
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                            style={{ background: getAvatarGradient(entry.key) }}
                          >
                            <User className="h-4 w-4 text-white" />
                          </div>
                        )}

                        {/* Labels */}
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-foreground">{entry.primary}</p>
                          <p className="truncate text-xs text-muted-foreground">{entry.secondary}</p>
                        </div>

                        {/* Value */}
                        <div className="shrink-0 text-right">
                          <p className="font-bold text-foreground">{entry.value}</p>
                        </div>
                      </div>
                    );

                    return entry.href ? (
                      <Link key={entry.key} href={entry.href}>
                        {inner}
                      </Link>
                    ) : (
                      <div key={entry.key}>{inner}</div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
