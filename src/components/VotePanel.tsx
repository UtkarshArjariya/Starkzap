"use client";

import { castVote, getExplorerTransactionUrl } from "@/lib/contract";
import type { Dare } from "@/lib/types";
import { useContractAction } from "@/hooks/useContract";
import { useWallet } from "@/lib/starkzap";
import { addressesEqual } from "@/lib/utils";

type VotePanelProps = {
  dare: Dare;
  onVoted: () => Promise<void>;
};

export default function VotePanel({ dare, onVoted }: VotePanelProps) {
  const { withWallet, isPending, error } = useContractAction();
  const { address } = useWallet();
  const totalVotes = dare.approveVotes + dare.rejectVotes;
  const approveShare =
    totalVotes === 0 ? 0 : (dare.approveVotes / totalVotes) * 100;

  const isClaimer = !!address && addressesEqual(address, dare.claimer);
  const isRestricted = !address || isClaimer;

  async function handleVote(approve: boolean) {
    await withWallet(async (wallet) => {
      const tx = await castVote(wallet, dare.id, approve);
      await onVoted();
      window.open(
        getExplorerTransactionUrl(tx.transaction_hash),
        "_blank",
        "noopener,noreferrer",
      );
      return tx;
    });
  }

  return (
    <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-white/40">
            Proof submitted
          </p>
          <a
            href={dare.proofUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-2 block text-sm font-semibold text-accent-soft underline-offset-4 hover:underline"
          >
            Open proof link
          </a>
        </div>
        <div className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/50">
          {dare.userHasVoted ? "Voted" : "Open vote"}
        </div>
      </div>

      <p className="mb-5 text-sm leading-6 text-white/70">
        {dare.proofDescription}
      </p>

      <div className="mb-5">
        <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.18em] text-white/45">
          <span>Approve ratio</span>
          <span>
            {dare.approveVotes} / {totalVotes || 0}
          </span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-accent transition-[width]"
            style={{ width: `${approveShare}%` }}
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => void handleVote(true)}
          disabled={isPending || dare.userHasVoted || isRestricted}
          className="rounded-full bg-emerald-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Approve
        </button>
        <button
          type="button"
          onClick={() => void handleVote(false)}
          disabled={isPending || dare.userHasVoted || isRestricted}
          className="rounded-full bg-rose-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-rose-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Reject
        </button>
      </div>

      {dare.userHasVoted ? (
        <p className="mt-4 text-sm text-white/55">
          You already voted on this dare.
        </p>
      ) : null}
      {!address ? (
        <p className="mt-2 text-sm text-white/45">
          Connect your wallet to vote.
        </p>
      ) : isClaimer ? (
        <p className="mt-2 text-sm text-white/45">
          Only the proof claimer is restricted from voting on this dare.
        </p>
      ) : null}
      {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}
    </section>
  );
}
