"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ExternalLink, Flame } from "lucide-react";
import { formatAmount, getTokenDecimals, getTokenSymbol } from "@/lib/config";
import { stripTags } from "@/lib/categories";
import type { SerializedDare } from "@/lib/types";

export default function DareOfTheDay() {
  const [dare, setDare] = useState<SerializedDare | null>(null);

  useEffect(() => {
    void fetch("/api/dare-of-day")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: SerializedDare | null) => {
        if (data?.id) setDare(data);
      })
      .catch(() => {});
  }, []);

  if (!dare) return null;

  const symbol = getTokenSymbol(dare.rewardToken);
  const amount = formatAmount(dare.rewardAmount, getTokenDecimals(dare.rewardToken));
  const totalVotes = dare.approveVotes + dare.rejectVotes;
  const shareText = encodeURIComponent(`Check out this dare: "${dare.title}" with ${amount} ${symbol} at stake!`);
  const shareUrl = encodeURIComponent(`${typeof window !== "undefined" ? window.location.origin : ""}/dare/${dare.id}`);

  return (
    <div className="mt-8 rounded-2xl border-l-4 border-l-fuchsia-400 border border-fuchsia-300/15 bg-fuchsia-300/5 px-5 py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-fuchsia-200">
            <Flame className="h-3.5 w-3.5" />
            Dare of the Day
          </div>
          <h3 className="mt-2 text-lg font-semibold text-white truncate">{dare.title}</h3>
          {stripTags(dare.description) ? (
            <p className="mt-1 line-clamp-1 text-sm text-slate-400">{stripTags(dare.description)}</p>
          ) : null}
          <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-400">
            <span className="font-semibold text-fuchsia-100">{amount} {symbol}</span>
            {totalVotes > 0 ? <span>{totalVotes} vote{totalVotes !== 1 ? "s" : ""}</span> : null}
            <span>{dare.status}</span>
          </div>
        </div>

        <div className="flex shrink-0 gap-2">
          <Link
            className="inline-flex items-center gap-1.5 rounded-full bg-fuchsia-500/20 border border-fuchsia-300/20 px-4 py-2 text-xs font-medium text-fuchsia-100 transition hover:bg-fuchsia-500/30"
            href={`/dare/${dare.id}`}
          >
            {dare.status === "Voting" ? "Vote Now" : "View"} &rarr;
          </Link>
          <a
            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-400 transition hover:text-white"
            href={`https://x.com/intent/tweet?text=${shareText}&url=${shareUrl}`}
            rel="noreferrer"
            target="_blank"
          >
            <ExternalLink className="h-3 w-3" />
            Share
          </a>
        </div>
      </div>
    </div>
  );
}
