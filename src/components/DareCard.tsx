"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, Check, Copy } from "lucide-react";
import CountdownTimer from "@/components/CountdownTimer";
import StarknetAddress from "@/components/StarknetAddress";
import StatusBadge from "@/components/StatusBadge";
import { formatAmount, getTokenDecimals, getTokenSymbol } from "@/lib/config";
import { extractTags, stripTags } from "@/lib/categories";
import type { Dare } from "@/lib/types";

export function DareCardSkeleton() {
  return (
    <div className="animate-pulse rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="h-5 w-20 rounded-full bg-white/10" />
          <div className="h-5 w-48 rounded bg-white/10" />
        </div>
        <div className="h-6 w-16 rounded-full bg-white/10" />
      </div>
      <div className="mb-5 space-y-2">
        <div className="h-4 w-full rounded bg-white/10" />
        <div className="h-4 w-3/4 rounded bg-white/10" />
      </div>
      <div className="rounded-[1.25rem] border border-white/10 bg-slate-950/50 p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <div className="h-3 w-16 rounded bg-white/10" />
            <div className="h-4 w-28 rounded bg-white/10" />
          </div>
          <div className="space-y-2">
            <div className="h-3 w-16 rounded bg-white/10" />
            <div className="h-4 w-24 rounded bg-white/10" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DareCard({ dare }: { dare: Dare }) {
  const tokenSymbol = getTokenSymbol(dare.rewardToken);
  const amount = formatAmount(dare.rewardAmount, getTokenDecimals(dare.rewardToken));
  const tags = extractTags(dare.description);
  const cleanDescription = stripTags(dare.description);
  const totalVotes = dare.approveVotes + dare.rejectVotes;
  const approvePercent = totalVotes > 0 ? Math.round((dare.approveVotes / totalVotes) * 100) : 0;
  const [copied, setCopied] = useState(false);

  const handleShare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const base = `${window.location.origin}/dare/${dare.id.toString()}`;
    const url = dare.legacy && dare.contractAddress
      ? `${base}?contract=${dare.contractAddress}`
      : base;
    void navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    });
  };

  return (
    <Link
      className="group block rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-5 transition hover:-translate-y-0.5 hover:border-cyan-300/20 hover:bg-white/[0.08] hover:shadow-glow"
      href={dare.legacy && dare.contractAddress
        ? `/dare/${dare.id.toString()}?contract=${dare.contractAddress}`
        : `/dare/${dare.id.toString()}`}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <div className="inline-flex rounded-full border border-fuchsia-300/10 bg-fuchsia-300/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.22em] text-fuchsia-100">
              {amount} {tokenSymbol}
            </div>
            {dare.legacy ? (
              <div className="inline-flex rounded-full border border-slate-400/20 bg-slate-400/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.22em] text-slate-400">
                Legacy
              </div>
            ) : null}
          </div>
          <h3 className="text-lg font-semibold leading-tight text-white">{dare.title}</h3>
        </div>
        <StatusBadge status={dare.status} />
      </div>

      {cleanDescription ? (
        <p className="mb-3 line-clamp-2 text-sm leading-6 text-slate-300/85">{cleanDescription}</p>
      ) : null}

      {tags.length > 0 ? (
        <div className="mb-4 flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span key={tag} className="rounded-full border border-fuchsia-300/10 bg-fuchsia-300/5 px-2 py-0.5 text-[10px] text-fuchsia-200/80">
              {tag}
            </span>
          ))}
        </div>
      ) : null}

      <div className="grid gap-3 rounded-[1.25rem] border border-white/10 bg-slate-950/50 p-4 sm:grid-cols-2">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Posted by</p>
          <div className="mt-2" onClick={(e) => e.preventDefault()}>
            <StarknetAddress address={dare.poster} />
          </div>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
            {dare.status === "Voting" ? "Voting window" : "Deadline"}
          </p>
          <div className="mt-2">
            <CountdownTimer
              compact
              targetTimestamp={dare.status === "Voting" && dare.votingEnd > 0 ? dare.votingEnd : dare.deadline}
            />
          </div>
        </div>
      </div>

      {dare.status === "Voting" ? (
        <div className="mt-4 rounded-[1.25rem] border border-amber-200/10 bg-amber-300/5 p-4">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-emerald-200">{dare.approveVotes} approve</span>
            <span className="text-slate-500">{dare.rejectVotes} reject</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-300 to-cyan-300"
              style={{ width: `${approvePercent}%` }}
            />
          </div>
        </div>
      ) : null}

      <div className="mt-4 flex items-center justify-between text-sm text-slate-400">
        <span>
          {dare.status === "Open"
            ? "Claim this dare"
            : dare.status === "Voting"
              ? "Review the proof"
              : "Open details"}
        </span>
        <div className="flex items-center gap-2">
          <button
            className="rounded-lg p-1.5 text-slate-500 transition hover:bg-white/10 hover:text-slate-200"
            title={copied ? "Copied!" : "Copy link"}
            onClick={handleShare}
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
          <ArrowUpRight className="h-4 w-4 transition group-hover:text-cyan-200" />
        </div>
      </div>
    </Link>
  );
}
