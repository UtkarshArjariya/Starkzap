import Link from "next/link";

import StatusBadge from "@/components/StatusBadge";
import type { Dare } from "@/lib/types";
import { formatTimestamp, getCountdownLabel, shortenAddress } from "@/lib/utils";

function getCtaLabel(dare: Dare) {
  switch (dare.status) {
    case "Open":
      return "Claim This Dare";
    case "Voting":
      return "Vote Now";
    case "Claimed":
      return "Submit Proof";
    default:
      return "View Result";
  }
}

export default function DareCard({ dare }: { dare: Dare }) {
  const totalVotes = dare.approveVotes + dare.rejectVotes;
  const approveShare = totalVotes === 0 ? 0 : (dare.approveVotes / totalVotes) * 100;

  return (
    <Link
      href={`/dare/${dare.id.toString()}`}
      className="group block overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_14px_50px_rgba(0,0,0,0.22)] transition hover:-translate-y-0.5 hover:border-accent/40 hover:bg-white/[0.06]"
    >
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="mb-2 text-xs uppercase tracking-[0.24em] text-white/40">
            {shortenAddress(dare.poster)} posted this dare
          </p>
          <h3 className="text-xl font-semibold text-white">{dare.title}</h3>
        </div>
        <StatusBadge status={dare.status} />
      </div>

      <p className="mb-5 line-clamp-3 text-sm leading-6 text-white/70">{dare.description}</p>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
          <p className="text-xs uppercase tracking-[0.2em] text-white/35">Reward</p>
          <p className="mt-2 text-lg font-semibold text-white">{dare.rewardAmountFormatted}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
          <p className="text-xs uppercase tracking-[0.2em] text-white/35">Deadline</p>
          <p className="mt-2 text-sm font-medium text-white">{formatTimestamp(dare.deadline)}</p>
          <p className="mt-1 text-xs text-white/45">{getCountdownLabel(dare.deadline)}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
          <p className="text-xs uppercase tracking-[0.2em] text-white/35">Action</p>
          <p className="mt-2 text-sm font-semibold text-accent-soft transition group-hover:text-white">
            {getCtaLabel(dare)}
          </p>
        </div>
      </div>

      {dare.status === "Voting" ? (
        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.18em] text-white/45">
            <span>Vote split</span>
            <span>
              {dare.approveVotes} approve / {dare.rejectVotes} reject
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-accent transition-[width]"
              style={{ width: `${approveShare}%` }}
            />
          </div>
        </div>
      ) : null}
    </Link>
  );
}
