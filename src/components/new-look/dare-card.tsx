"use client";

import Link from "next/link";
import { Clock, Copy, Check, Flame, Users } from "lucide-react";
import { useState } from "react";
import { formatAmount, getTokenDecimals, getTokenSymbol } from "@/lib/config";
import { extractTags, stripTags } from "@/lib/categories";
import CountdownTimer from "@/components/CountdownTimer";
import type { Dare, DareStatus } from "@/lib/types";

const statusConfig: Record<DareStatus, { label: string; className: string }> = {
  Open: { label: "Open", className: "bg-success/20 text-success border-success/30" },
  Claimed: { label: "Claimed", className: "bg-warning/20 text-warning border-warning/30" },
  Voting: { label: "Voting", className: "bg-accent/20 text-accent border-accent/30" },
  Approved: { label: "Approved", className: "bg-success/20 text-success border-success/30" },
  Rejected: { label: "Rejected", className: "bg-destructive/20 text-destructive border-destructive/30" },
  Expired: { label: "Expired", className: "bg-muted text-muted-foreground border-muted" },
  Cancelled: { label: "Cancelled", className: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
};

export function ModernDareCard({ dare }: { dare: Dare }) {
  const [copied, setCopied] = useState(false);
  const status = statusConfig[dare.status];
  const tokenSymbol = getTokenSymbol(dare.rewardToken);
  const amount = formatAmount(dare.rewardAmount, getTokenDecimals(dare.rewardToken));
  const tags = extractTags(dare.description);
  const totalVotes = dare.approveVotes + dare.rejectVotes;
  const votePercentage = totalVotes > 0 ? (dare.approveVotes / totalVotes) * 100 : 50;
  const isHighValue = Number(dare.rewardAmount) / (10 ** getTokenDecimals(dare.rewardToken)) >= 10;
  const isFinished = dare.status === "Approved" || dare.status === "Rejected" || dare.status === "Expired";

  const now = Math.floor(Date.now() / 1000);
  const hoursLeft = (dare.deadline - now) / 3600;
  const isUrgent = dare.status === "Open" && hoursLeft > 0 && hoursLeft < 6;

  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const base = `${window.location.origin}/dare/${dare.id.toString()}`;
    const url = dare.legacy && dare.contractAddress
      ? `${base}?contract=${dare.contractAddress}`
      : base;
    void navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <Link
      href={dare.legacy && dare.contractAddress
        ? `/dare/${dare.id.toString()}?contract=${dare.contractAddress}`
        : `/dare/${dare.id.toString()}`}
    >
      <article
        className={`group relative overflow-hidden rounded-[1.75rem] border bg-card p-5 transition-all duration-200 hover:-translate-y-1 ${
          isFinished ? "opacity-75 hover:opacity-100" : ""
        } ${
          dare.status === "Open" ? "border-l-4 border-l-success border-t-border border-r-border border-b-border" : "border-border"
        } ${
          dare.status === "Voting" ? "border-accent/50" : ""
        }`}
      >
        {/* Top Row */}
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${status.className}`}>
              {dare.status === "Voting" && (
                <span className="mr-1.5 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
              )}
              {status.label}
            </span>
            {dare.legacy && (
              <span className="rounded-full border border-amber-500/30 bg-warning/20 px-2.5 py-0.5 text-xs font-medium text-warning">
                Legacy
              </span>
            )}
            {isUrgent && (
              <span className="flex items-center gap-1 rounded-full bg-destructive/20 px-2 py-0.5 text-xs font-medium text-destructive">
                <Clock className="h-3 w-3" />
                Ending soon
              </span>
            )}
            {isHighValue && (
              <span className="flex items-center gap-1 rounded-full bg-warning/20 px-2 py-0.5 text-xs font-medium text-warning">
                <Flame className="h-3 w-3" />
                High Reward
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 rounded-2xl bg-accent/10 px-3 py-1.5">
            <span className="text-lg font-bold text-accent">{amount}</span>
            <span className="text-xs font-medium text-accent/80">{tokenSymbol}</span>
          </div>
        </div>

        {/* Title */}
        <h3 className="mb-2 text-lg font-semibold leading-tight text-foreground transition-colors group-hover:text-primary">
          {dare.title}
        </h3>

        {/* Description */}
        {stripTags(dare.description) ? (
          <p className="mb-4 line-clamp-2 text-sm text-muted-foreground">
            {stripTags(dare.description)}
          </p>
        ) : null}

        {/* Tags */}
        {tags.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-1.5">
            {tags.slice(0, 3).map((tag) => (
              <span key={tag} className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Voting Bar */}
        {dare.status === "Voting" && (
          <div className="mb-4">
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="flex items-center gap-1 text-success">
                <Users className="h-3 w-3" />
                {dare.approveVotes} Approve
              </span>
              <span className="text-destructive">{dare.rejectVotes} Reject</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-destructive/30">
              <div
                className="h-full rounded-full bg-success transition-all duration-500"
                style={{ width: `${votePercentage}%` }}
              />
            </div>
          </div>
        )}

        {/* Bottom Row */}
        <div className="flex items-center justify-between border-t border-border pt-4">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <CountdownTimer
              compact
              targetTimestamp={dare.status === "Voting" && dare.votingEnd > 0 ? dare.votingEnd : dare.deadline}
            />
          </div>

          <button
            onClick={handleCopy}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-secondary text-muted-foreground transition-colors hover:bg-primary/20 hover:text-primary"
            aria-label="Copy link"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>

        {dare.legacy && (
          <div className="mt-3 rounded-xl border border-warning/20 bg-warning/5 px-3 py-2 text-center text-xs text-warning/80">
            Legacy contract - view only
          </div>
        )}

        {/* Hover Glow */}
        <div
          className="pointer-events-none absolute inset-0 rounded-[1.75rem] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{ boxShadow: "inset 0 0 60px -30px hsl(var(--primary))" }}
        />
      </article>
    </Link>
  );
}

export function ModernDareCardSkeleton() {
  return (
    <div className="animate-pulse rounded-[1.75rem] border border-border bg-card p-5">
      <div className="mb-3 flex items-start justify-between">
        <div className="h-6 w-16 rounded-full bg-muted" />
        <div className="h-8 w-20 rounded-2xl bg-muted" />
      </div>
      <div className="mb-2 h-6 w-3/4 rounded bg-muted" />
      <div className="mb-4 space-y-2">
        <div className="h-4 w-full rounded bg-muted" />
        <div className="h-4 w-2/3 rounded bg-muted" />
      </div>
      <div className="flex items-center justify-between border-t border-border pt-4">
        <div className="h-4 w-24 rounded bg-muted" />
        <div className="h-8 w-8 rounded-xl bg-muted" />
      </div>
    </div>
  );
}
