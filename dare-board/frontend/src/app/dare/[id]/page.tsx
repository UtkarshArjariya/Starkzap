"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  FlaskConical,
  Hourglass,
  Trophy,
  Zap,
} from "lucide-react";
import CountdownTimer from "@/components/CountdownTimer";
import Header from "@/components/Header";
import LoadingSpinner from "@/components/LoadingSpinner";
import ProofModal from "@/components/ProofModal";
import StatusBadge from "@/components/StatusBadge";
import VotePanel from "@/components/VotePanel";
import { useWallet } from "@/context/WalletContext";
import {
  IS_DEMO_MODE,
  STARKSCAN_URL,
  ZERO_ADDRESS,
  addressesMatch,
  formatAmount,
  getTokenSymbol,
  shortAddress,
} from "@/lib/config";
import { claimDare, finalizeDare, getDare } from "@/lib/contract";
import type { Dare } from "@/lib/types";

export default function DarePage() {
  const params = useParams<{ id: string }>();
  const { wallet, connect } = useWallet();
  const [dare, setDare] = useState<Dare | null>(null);
  const [loading, setLoading] = useState(true);
  const [txLoading, setTxLoading] = useState("");
  const [txHash, setTxHash] = useState("");
  const [error, setError] = useState("");
  const [showProofModal, setShowProofModal] = useState(false);

  const dareId = useMemo(() => {
    try {
      return BigInt(params.id);
    } catch {
      return null;
    }
  }, [params.id]);

  const loadDare = useCallback(async () => {
    if (dareId === null) {
      setError("Invalid dare id");
      setLoading(false);
      return;
    }

    try {
      const nextDare = await getDare(dareId);
      setDare(nextDare);
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load dare");
    } finally {
      setLoading(false);
    }
  }, [dareId]);

  useEffect(() => {
    void loadDare();
    const interval = window.setInterval(() => void loadDare(), 10000);

    return () => window.clearInterval(interval);
  }, [loadDare]);

  const now = Math.floor(Date.now() / 1000);
  const symbol = dare ? getTokenSymbol(dare.rewardToken) : "TOKEN";
  const rewardAmount = dare ? formatAmount(dare.rewardAmount) : "0";
  const isPoster = dare && wallet ? addressesMatch(wallet.address, dare.poster) : false;
  const isClaimer = dare && wallet ? addressesMatch(wallet.address, dare.claimer) : false;
  const canClaim = !!dare && dare.status === "Open" && !isPoster && now < dare.deadline;
  const canSubmitProof = !!dare && dare.status === "Claimed" && isClaimer;
  const canFinalize =
    !!dare &&
    ((dare.status === "Voting" && now >= dare.votingEnd) ||
      ((dare.status === "Claimed" || dare.status === "Open") && now > dare.deadline));

  const handleClaim = async () => {
    if (!dare || dareId === null) {
      return;
    }

    setError("");
    setTxLoading("Claiming dare...");

    try {
      const activeWallet = wallet ?? (await connect());
      const hash = await claimDare(activeWallet, dareId);
      setTxHash(hash);
      await loadDare();
    } catch (claimError) {
      setError(claimError instanceof Error ? claimError.message : "Claim failed");
    } finally {
      setTxLoading("");
    }
  };

  const handleFinalize = async () => {
    if (!dare || dareId === null) {
      return;
    }

    setError("");
    setTxLoading("Finalizing dare...");

    try {
      const activeWallet = wallet ?? (await connect());
      const hash = await finalizeDare(activeWallet, dareId);
      setTxHash(hash);
      await loadDare();
    } catch (finalizeError) {
      setError(finalizeError instanceof Error ? finalizeError.message : "Finalize failed");
    } finally {
      setTxLoading("");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="mx-auto flex max-w-5xl items-center justify-center px-4 py-24">
          <LoadingSpinner size="lg" text="Loading dare..." />
        </div>
      </div>
    );
  }

  if (!dare || error) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6">
          <p className="text-lg font-semibold text-white">Dare unavailable</p>
          <p className="mt-2 text-sm text-rose-100/80">{error || "The requested dare could not be found."}</p>
          <Link className="mt-5 inline-flex items-center gap-2 text-sm text-cyan-200 transition hover:text-white" href="/">
            <ArrowLeft className="h-4 w-4" />
            Back to feed
          </Link>
        </div>
      </div>
    );
  }

  const claimerVisible = dare.claimer && dare.claimer !== ZERO_ADDRESS && dare.status !== "Open";
  const isFinished = dare.status === "Approved" || dare.status === "Rejected" || dare.status === "Expired";

  return (
    <div className="min-h-screen">
      <Header />

      <main className="mx-auto max-w-5xl px-4 pb-16 pt-8 sm:px-6">
        <Link className="inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white" href="/">
          <ArrowLeft className="h-4 w-4" />
          Back to feed
        </Link>

        {IS_DEMO_MODE ? (
          <div className="mt-5 rounded-[1.5rem] border border-amber-200/15 bg-amber-200/10 px-5 py-4 text-sm text-amber-50">
            <div className="flex items-start gap-3">
              <FlaskConical className="mt-0.5 h-4 w-4 shrink-0" />
              <p>Preview mode is active. Actions are visible, but on-chain writes will fail until a contract address is configured.</p>
            </div>
          </div>
        ) : null}

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          <section className="surface-panel px-6 py-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="inline-flex rounded-full border border-fuchsia-300/15 bg-fuchsia-300/10 px-3 py-1 text-xs uppercase tracking-[0.22em] text-fuchsia-100">
                  Reward {rewardAmount} {symbol}
                </div>
                <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">{dare.title}</h1>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">{dare.description || "No extra description provided."}</p>
              </div>
              <StatusBadge size="lg" status={dare.status} />
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="Poster" value={shortAddress(dare.poster)} />
              <MetricCard label="Deadline" value={<CountdownTimer compact targetTimestamp={dare.deadline} />} />
              <MetricCard label="Approvals" value={`${dare.approveVotes}`} />
              <MetricCard label="Rejections" value={`${dare.rejectVotes}`} />
              {claimerVisible ? <MetricCard label="Claimer" value={shortAddress(dare.claimer)} /> : null}
              {dare.status === "Voting" && dare.votingEnd > 0 ? (
                <MetricCard label="Voting ends" value={<CountdownTimer compact targetTimestamp={dare.votingEnd} />} />
              ) : null}
            </div>

            {isFinished ? (
              <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-white/[0.04] px-5 py-4 text-sm text-slate-200">
                <div className="flex items-start gap-3">
                  {dare.status === "Approved" ? <Trophy className="mt-0.5 h-4 w-4 text-emerald-200" /> : <CheckCircle2 className="mt-0.5 h-4 w-4 text-cyan-200" />}
                  <p>
                    {dare.status === "Approved"
                      ? "The challenge passed community review and the reward is released to the claimer."
                      : dare.status === "Rejected"
                        ? "The proof did not pass review, so the reward returns to the poster."
                        : "The challenge expired before successful completion, so escrow returns to the poster."}
                  </p>
                </div>
              </div>
            ) : null}

            <div className="mt-6 space-y-3">
              {canClaim ? (
                <button
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:opacity-60"
                  disabled={!!txLoading}
                  onClick={() => void handleClaim()}
                >
                  {txLoading ? <LoadingSpinner size="sm" /> : <Zap className="h-4 w-4" />}
                  {txLoading || "Claim this dare"}
                </button>
              ) : !wallet && dare.status === "Open" ? (
                <button
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/10"
                  onClick={() => void connect()}
                >
                  Connect wallet to claim
                </button>
              ) : null}

              {canSubmitProof ? (
                <button
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-fuchsia-300/20 bg-fuchsia-300/10 px-4 py-3 text-sm font-semibold text-fuchsia-100 transition hover:bg-fuchsia-300/15"
                  onClick={() => setShowProofModal(true)}
                >
                  Submit proof
                </button>
              ) : null}

              {canFinalize ? (
                <button
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-amber-200/20 bg-amber-200/10 px-4 py-3 text-sm font-semibold text-amber-100 transition hover:bg-amber-200/15 disabled:opacity-60"
                  disabled={!!txLoading}
                  onClick={() => void handleFinalize()}
                >
                  {txLoading ? <LoadingSpinner size="sm" /> : <Hourglass className="h-4 w-4" />}
                  {txLoading || "Finalize dare"}
                </button>
              ) : null}
            </div>

            {txHash ? (
              <div className="mt-4 text-center">
                <a
                  className="inline-flex items-center gap-1.5 text-sm text-cyan-200 transition hover:text-white"
                  href={`${STARKSCAN_URL}/tx/${txHash}`}
                  rel="noreferrer"
                  target="_blank"
                >
                  View latest transaction
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            ) : null}

            {error ? (
              <div className="mt-4 rounded-2xl border border-rose-300/20 bg-rose-300/10 px-4 py-3 text-sm text-rose-100">{error}</div>
            ) : null}
          </section>

          <aside className="space-y-6">
            <section className="surface-panel px-6 py-6">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Lifecycle</p>
              <ol className="mt-4 space-y-4 text-sm leading-6 text-slate-300">
                <li>
                  <span className="font-semibold text-white">1.</span> Claim before the deadline if you want the slot.
                </li>
                <li>
                  <span className="font-semibold text-white">2.</span> Submit public proof once the challenge is completed.
                </li>
                <li>
                  <span className="font-semibold text-white">3.</span> Community voters review the proof and cast a verdict.
                </li>
                <li>
                  <span className="font-semibold text-white">4.</span> Anyone can finalize once the time window closes.
                </li>
              </ol>
            </section>

            {dare.status === "Voting" ? (
              <section className="surface-panel px-6 py-6">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Community vote</p>
                <h2 className="mt-2 text-xl font-semibold text-white">Review the submitted proof</h2>
                <div className="mt-5">
                  <VotePanel dare={dare} onVoted={() => void loadDare()} />
                </div>
              </section>
            ) : null}
          </aside>
        </div>
      </main>

      {showProofModal && dareId !== null ? (
        <ProofModal
          dareId={dareId}
          onClose={() => setShowProofModal(false)}
          onConnect={connect}
          onSubmitted={() => {
            setShowProofModal(false);
            void loadDare();
          }}
          wallet={wallet}
        />
      ) : null}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-[1.25rem] border border-white/10 bg-slate-950/50 p-4">
      <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{label}</p>
      <div className="mt-2 text-sm font-medium text-slate-100">{value}</div>
    </div>
  );
}
