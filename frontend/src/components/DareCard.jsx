import { Link } from "react-router-dom";
import StatusBadge from "./StatusBadge";
import CountdownTimer from "./CountdownTimer";
import { getTokenSymbol, formatAmount, shortAddress } from "@/lib/config";
import { ArrowUpRight } from "lucide-react";

export default function DareCard({ dare }) {
  const symbol = getTokenSymbol(dare.rewardToken);
  const amount = formatAmount(dare.rewardAmount);
  const isVoting = dare.status === "Voting";
  const totalVotes = dare.approveVotes + dare.rejectVotes;
  const approvePercent = totalVotes > 0 ? Math.round((dare.approveVotes / totalVotes) * 100) : 0;

  return (
    <Link
      to={`/dare/${dare.id.toString()}`}
      data-testid={`dare-card-${dare.id}`}
      className="group block bg-white/5 hover:bg-white/8 border border-white/10 hover:border-purple-500/30 rounded-2xl p-5 transition-all duration-200 hover:shadow-lg hover:shadow-purple-900/10"
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="text-white font-semibold text-base leading-snug line-clamp-2 flex-1">
          {dare.title}
        </h3>
        <StatusBadge status={dare.status} />
      </div>

      {/* Description */}
      {dare.description && (
        <p className="text-gray-500 text-sm leading-relaxed line-clamp-2 mb-4">
          {dare.description}
        </p>
      )}

      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-3 text-xs mb-3">
        {/* Reward */}
        <div className="flex items-center gap-1.5 bg-purple-500/10 border border-purple-500/20 px-2.5 py-1 rounded-full">
          <span className="text-purple-300 font-semibold">
            {amount} {symbol}
          </span>
        </div>

        {/* Poster */}
        <span className="text-gray-600 font-mono">
          by {shortAddress(dare.poster)}
        </span>
      </div>

      {/* Vote bar (if Voting) */}
      {isVoting && totalVotes > 0 && (
        <div className="mb-3">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span className="text-green-400">{dare.approveVotes} approve</span>
            <span className="text-red-400">{dare.rejectVotes} reject</span>
          </div>
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full transition-all duration-500"
              style={{ width: `${approvePercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Footer: countdown + arrow */}
      <div className="flex items-center justify-between mt-1">
        {dare.status === "Voting" && dare.votingEnd > 0 ? (
          <CountdownTimer targetTimestamp={dare.votingEnd} label="Voting ends" compact />
        ) : dare.status === "Open" || dare.status === "Claimed" ? (
          <CountdownTimer targetTimestamp={dare.deadline} label="Deadline" compact />
        ) : (
          <span className="text-xs text-gray-600">
            {dare.status === "Approved" ? "Completed" : dare.status}
          </span>
        )}
        <ArrowUpRight
          size={16}
          className="text-gray-600 group-hover:text-purple-400 transition-colors"
        />
      </div>
    </Link>
  );
}
