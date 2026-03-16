import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import CountdownTimer from "@/components/CountdownTimer";
import StatusBadge from "@/components/StatusBadge";
import { formatAmount, getTokenSymbol, shortAddress } from "@/lib/config";
import type { Dare } from "@/lib/types";

export default function DareCard({ dare }: { dare: Dare }) {
  const tokenSymbol = getTokenSymbol(dare.rewardToken);
  const amount = formatAmount(dare.rewardAmount);
  const totalVotes = dare.approveVotes + dare.rejectVotes;
  const approvePercent = totalVotes > 0 ? Math.round((dare.approveVotes / totalVotes) * 100) : 0;

  return (
    <Link
      className="group block rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-5 transition hover:-translate-y-0.5 hover:border-cyan-300/20 hover:bg-white/[0.08] hover:shadow-glow"
      href={`/dare/${dare.id.toString()}`}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="inline-flex rounded-full border border-fuchsia-300/10 bg-fuchsia-300/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.22em] text-fuchsia-100">
            {amount} {tokenSymbol}
          </div>
          <h3 className="text-lg font-semibold leading-tight text-white">{dare.title}</h3>
        </div>
        <StatusBadge status={dare.status} />
      </div>

      {dare.description ? (
        <p className="mb-5 line-clamp-2 text-sm leading-6 text-slate-300/85">{dare.description}</p>
      ) : null}

      <div className="grid gap-3 rounded-[1.25rem] border border-white/10 bg-slate-950/50 p-4 sm:grid-cols-2">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Posted by</p>
          <p className="mt-2 font-mono text-sm text-slate-200">{shortAddress(dare.poster)}</p>
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
        <ArrowUpRight className="h-4 w-4 transition group-hover:text-cyan-200" />
      </div>
    </Link>
  );
}
