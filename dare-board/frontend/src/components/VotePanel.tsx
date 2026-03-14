"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ExternalLink, ThumbsDown, ThumbsUp } from "lucide-react";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useWallet } from "@/context/WalletContext";
import { IS_DEMO_MODE, STARKSCAN_URL, addressesMatch } from "@/lib/config";
import { castVote, hasVoterVoted } from "@/lib/contract";
import type { Dare } from "@/lib/types";

export default function VotePanel({ dare, onVoted }: { dare: Dare; onVoted?: () => void }) {
  const { wallet, connect } = useWallet();
  const [voted, setVoted] = useState(false);
  const [txHash, setTxHash] = useState("");
  const [loading, setLoading] = useState("");
  const [error, setError] = useState("");
  const [checkingVote, setCheckingVote] = useState(true);

  const totalVotes = dare.approveVotes + dare.rejectVotes;
  const approvePercent = totalVotes > 0 ? Math.round((dare.approveVotes / totalVotes) * 100) : 50;
  const isPoster = wallet ? addressesMatch(wallet.address, dare.poster) : false;
  const isClaimer = wallet ? addressesMatch(wallet.address, dare.claimer) : false;

  useEffect(() => {
    if (!wallet?.address || !dare.id || IS_DEMO_MODE) {
      setCheckingVote(false);
      return;
    }

    setCheckingVote(true);
    void hasVoterVoted(dare.id, wallet.address)
      .then((value) => setVoted(value))
      .finally(() => setCheckingVote(false));
  }, [wallet?.address, dare.id]);

  const helperMessage = useMemo(() => {
    if (IS_DEMO_MODE) {
      return "Voting is disabled in preview mode until a contract address is configured.";
    }

    if (isPoster) {
      return "You posted this dare, so you cannot vote on it.";
    }

    if (isClaimer) {
      return "You claimed this dare, so community voting is disabled for your wallet.";
    }

    return "";
  }, [isClaimer, isPoster]);

  const handleVote = async (approve: boolean) => {
    setError("");
    setLoading(approve ? "Approving..." : "Rejecting...");

    try {
      const activeWallet = wallet ?? (await connect());
      const hash = await castVote(activeWallet, dare.id, approve);
      setTxHash(hash);
      setVoted(true);
      onVoted?.();
    } catch (voteError) {
      setError(voteError instanceof Error ? voteError.message : "Vote failed");
    } finally {
      setLoading("");
    }
  };

  return (
    <div className="space-y-4">
      {dare.proofUrl ? (
        <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-4">
          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Submitted proof</p>
          <a
            className="mt-2 inline-flex items-center gap-1.5 break-all text-sm text-cyan-200 transition hover:text-white"
            href={dare.proofUrl}
            rel="noreferrer"
            target="_blank"
          >
            {dare.proofUrl}
            <ExternalLink className="h-4 w-4" />
          </a>
          {dare.proofDescription ? (
            <p className="mt-3 text-sm leading-6 text-slate-300">{dare.proofDescription}</p>
          ) : null}
        </div>
      ) : null}

      <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/50 p-4">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="text-emerald-200">{dare.approveVotes} approve</span>
          <span className="text-slate-500">{totalVotes} total votes</span>
          <span className="text-rose-200">{dare.rejectVotes} reject</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-300 via-cyan-300 to-sky-300"
            style={{ width: `${approvePercent}%` }}
          />
        </div>
      </div>

      {helperMessage ? (
        <div className="rounded-2xl border border-amber-200/20 bg-amber-200/10 px-4 py-3 text-sm text-amber-100">
          {helperMessage}
        </div>
      ) : null}

      {voted && !loading ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-4 py-3 text-sm text-emerald-100">
          <CheckCircle2 className="h-4 w-4" />
          Vote recorded on-chain
          {txHash ? (
            <a
              className="text-cyan-200 transition hover:text-white"
              href={`${STARKSCAN_URL}/tx/${txHash}`}
              rel="noreferrer"
              target="_blank"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          ) : null}
        </div>
      ) : null}

      {!IS_DEMO_MODE && !voted && !isPoster && !isClaimer && !checkingVote ? (
        wallet ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-4 py-3 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-300/15 disabled:opacity-60"
              disabled={!!loading}
              onClick={() => void handleVote(true)}
            >
              {loading === "Approving..." ? <LoadingSpinner size="sm" /> : <ThumbsUp className="h-4 w-4" />}
              Approve proof
            </button>
            <button
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-300/20 bg-rose-300/10 px-4 py-3 text-sm font-semibold text-rose-100 transition hover:bg-rose-300/15 disabled:opacity-60"
              disabled={!!loading}
              onClick={() => void handleVote(false)}
            >
              {loading === "Rejecting..." ? <LoadingSpinner size="sm" /> : <ThumbsDown className="h-4 w-4" />}
              Reject proof
            </button>
          </div>
        ) : (
          <button
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
            onClick={() => void connect()}
          >
            Connect wallet to vote
          </button>
        )
      ) : null}

      {loading ? (
        <div className="flex items-center justify-center gap-2 text-sm text-slate-400">
          <LoadingSpinner size="sm" />
          {loading}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-rose-300/20 bg-rose-300/10 px-4 py-3 text-sm text-rose-100">
          {error}
        </div>
      ) : null}
    </div>
  );
}
