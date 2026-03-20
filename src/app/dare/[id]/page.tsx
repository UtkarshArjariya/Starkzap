"use client";

import confetti from "canvas-confetti";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  Hourglass,
  Trophy,
  XCircle,
  Zap,
} from "lucide-react";
import CountdownTimer from "@/components/CountdownTimer";
import AdaptiveHeader from "@/components/AdaptiveHeader";
import { ModernDareDetailPage } from "@/components/new-look/dare-detail-page";
import { useUI } from "@/context/UIContext";
import LoadingSpinner from "@/components/LoadingSpinner";
import ProofModal from "@/components/ProofModal";
import ShareButton from "@/components/ShareButton";
import StarknetAddress from "@/components/StarknetAddress";
import StatusBadge from "@/components/StatusBadge";
import VotePanel from "@/components/VotePanel";
import { useToast } from "@/context/ToastContext";
import { useWallet } from "@/context/WalletContext";
import {
  STARKSCAN_URL,
  ZERO_ADDRESS,
  addressesMatch,
  formatAmount,
  getTokenDecimals,
  getTokenSymbol,
  shortAddress,
} from "@/lib/config";
import { cancelDare, claimDare, finalizeDare, getDare } from "@/lib/contract";
import { extractTags, stripTags } from "@/lib/categories";
import { decodeContractError } from "@/lib/utils";
import type { Dare } from "@/lib/types";

export default function DarePage() {
  const { mode } = useUI();

  if (mode === "modern") return <ModernDareDetailPage />;

  return <ClassicDarePage />;
}

function ClassicDarePage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const legacyContract = searchParams.get("contract") || undefined;
  const { wallet, connect } = useWallet();
  const toast = useToast();
  const [dare, setDare] = useState<Dare | null>(null);
  const [loading, setLoading] = useState(true);
  const [txLoading, setTxLoading] = useState("");
  const [txHash, setTxHash] = useState("");
  const [error, setError] = useState("");
  const [showProofModal, setShowProofModal] = useState(false);
  const confettiFired = useRef(false);

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
      const nextDare = await getDare(dareId, legacyContract);
      setDare(nextDare);
      setError("");
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Failed to load dare",
      );
    } finally {
      setLoading(false);
    }
  }, [dareId, legacyContract]);

  useEffect(() => {
    void loadDare();
    const interval = window.setInterval(() => void loadDare(), 10000);

    return () => window.clearInterval(interval);
  }, [loadDare]);

  useEffect(() => {
    if (dare?.status === "Approved" && !confettiFired.current) {
      confettiFired.current = true;
      void confetti({
        particleCount: 120,
        spread: 70,
        origin: { y: 0.55 },
        colors: ["#a5f3fc", "#c4b5fd", "#86efac", "#fde68a"],
      });
    }
  }, [dare?.status]);

  const now = Math.floor(Date.now() / 1000);
  const symbol = dare ? getTokenSymbol(dare.rewardToken) : "TOKEN";
  const rewardAmount = dare
    ? formatAmount(dare.rewardAmount, getTokenDecimals(dare.rewardToken))
    : "0";
  const isPoster =
    dare && wallet ? addressesMatch(wallet.address, dare.poster) : false;
  const isClaimer =
    dare && wallet ? addressesMatch(wallet.address, dare.claimer) : false;
  const isLegacy = !!dare?.legacy;
  const canClaim =
    !!dare &&
    !isLegacy &&
    dare.status === "Open" &&
    !isPoster &&
    now < dare.deadline;
  const canSubmitProof =
    !!dare && !isLegacy && dare.status === "Claimed" && isClaimer;
  const canFinalize =
    !!dare &&
    !isLegacy &&
    ((dare.status === "Voting" && now >= dare.votingEnd) ||
      ((dare.status === "Claimed" || dare.status === "Open") &&
        now > dare.deadline));
  const canCancel = !!dare && !isLegacy && dare.status === "Open" && isPoster;

  // Expiry warning thresholds
  const hoursUntilDeadline = dare ? (dare.deadline - now) / 3600 : Infinity;
  const hoursUntilVotingEnd = dare?.votingEnd
    ? (dare.votingEnd - now) / 3600
    : Infinity;
  const showDeadlineWarning =
    !!dare &&
    dare.status !== "Approved" &&
    dare.status !== "Rejected" &&
    dare.status !== "Expired" &&
    hoursUntilDeadline > 0 &&
    hoursUntilDeadline < 6;
  const showVotingWarning =
    !!dare &&
    dare.status === "Voting" &&
    hoursUntilVotingEnd > 0 &&
    hoursUntilVotingEnd < 2;

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
      toast.success("Dare claimed! Now go do it.", { txHash: hash });
      await loadDare();
    } catch (claimError) {
      const msg = decodeContractError(claimError);
      setError(msg);
      toast.error(msg);
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
      toast.success("Dare finalized — reward distributed.", { txHash: hash });
      await loadDare();
    } catch (finalizeError) {
      const msg = decodeContractError(finalizeError);
      setError(msg);
      toast.error(msg);
    } finally {
      setTxLoading("");
    }
  };

  const handleCancel = async () => {
    if (!dare || dareId === null) {
      return;
    }

    if (!window.confirm("Cancel this dare and reclaim the escrowed reward?")) {
      return;
    }

    setError("");
    setTxLoading("Cancelling dare...");

    try {
      const activeWallet = wallet ?? (await connect());
      const hash = await cancelDare(activeWallet, dareId);
      setTxHash(hash);
      toast.success("Dare cancelled — reward returned to your wallet.", {
        txHash: hash,
      });
      await loadDare();
    } catch (cancelError) {
      const msg = decodeContractError(cancelError);
      setError(msg);
      toast.error(msg);
    } finally {
      setTxLoading("");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <AdaptiveHeader />
        <div className="mx-auto flex max-w-5xl items-center justify-center px-4 py-24">
          <LoadingSpinner size="lg" text="Loading dare..." />
        </div>
      </div>
    );
  }

  if (!dare || error) {
    return (
      <div className="min-h-screen">
        <AdaptiveHeader />
        <div className="mx-auto max-w-lg px-4 py-24 sm:px-6">
          <div className="surface-panel px-8 py-10 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-300/10">
              <XCircle className="h-7 w-7 text-rose-300" />
            </div>
            <h2 className="mt-5 text-xl font-semibold text-white">
              Dare not found
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              {error || "This dare doesn't exist or has been removed."}
            </p>
            <Link
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-cyan-300 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
              href="/"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to feed
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const claimerVisible =
    dare.claimer && dare.claimer !== ZERO_ADDRESS && dare.status !== "Open";
  const isFinished =
    dare.status === "Approved" ||
    dare.status === "Rejected" ||
    dare.status === "Expired";

  return (
    <div className="min-h-screen">
      <AdaptiveHeader />

      <main className="mx-auto max-w-5xl px-4 pb-16 pt-8 sm:px-6">
        <Link
          className="inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"
          href="/"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to feed
        </Link>

        {isLegacy ? (
          <div className="mt-6 rounded-2xl border border-amber-300/20 bg-amber-300/10 px-5 py-4 text-center">
            <p className="text-sm font-medium text-amber-200">
              This dare is from a legacy contract and is no longer supported.
            </p>
            <p className="mt-1 text-xs text-amber-200/60">
              It is displayed for historical purposes only. No actions can be
              performed.
            </p>
          </div>
        ) : null}

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          <section className="surface-panel px-6 py-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="inline-flex rounded-full border border-fuchsia-300/15 bg-fuchsia-300/10 px-3 py-1 text-xs uppercase tracking-[0.22em] text-fuchsia-100">
                  Reward {rewardAmount} {symbol}
                </div>
                <h1 className="mt-4 break-words text-2xl font-semibold tracking-tight text-white sm:text-3xl lg:text-4xl">
                  {dare.title}
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">
                  {stripTags(dare.description) ||
                    "No extra description provided."}
                </p>
                {extractTags(dare.description).length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {extractTags(dare.description).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-fuchsia-300/15 bg-fuchsia-300/10 px-2.5 py-1 text-[11px] uppercase tracking-wider text-fuchsia-200/80"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}
                <div className="mt-4">
                  <ShareButton dare={dare} />
                </div>
              </div>
              <StatusBadge size="lg" status={dare.status} />
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                label="Poster"
                value={<StarknetAddress address={dare.poster} />}
              />
              <MetricCard
                label="Deadline"
                value={
                  <CountdownTimer compact targetTimestamp={dare.deadline} />
                }
              />
              <MetricCard label="Approvals" value={`${dare.approveVotes}`} />
              <MetricCard label="Rejections" value={`${dare.rejectVotes}`} />
              {claimerVisible ? (
                <MetricCard
                  label="Claimer"
                  value={<StarknetAddress address={dare.claimer} />}
                />
              ) : null}
              {dare.status === "Voting" && dare.votingEnd > 0 ? (
                <MetricCard
                  label="Voting ends"
                  value={
                    <CountdownTimer compact targetTimestamp={dare.votingEnd} />
                  }
                />
              ) : null}
            </div>

            {/* Legacy banner */}
            {isLegacy ? (
              <div className="mt-6 flex items-center gap-2 rounded-2xl border border-slate-400/20 bg-slate-400/10 px-4 py-3 text-sm text-slate-300">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                This dare is from a previous contract version and is read-only.
              </div>
            ) : null}

            {/* Expiry warnings */}
            {showDeadlineWarning ? (
              <div className="mt-6 flex items-center gap-2 rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                Dare expires in {Math.floor(hoursUntilDeadline)}h{" "}
                {Math.floor((hoursUntilDeadline % 1) * 60)}m
              </div>
            ) : null}
            {showVotingWarning ? (
              <div className="mt-6 flex items-center gap-2 rounded-2xl border border-orange-400/20 bg-orange-400/10 px-4 py-3 text-sm text-orange-200">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                Voting closes in {Math.floor(hoursUntilVotingEnd * 60)} minutes
                — cast your vote now.
              </div>
            ) : null}

            {isFinished ? (
              <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-white/[0.04] px-5 py-4 text-sm text-slate-200">
                <div className="flex items-start gap-3">
                  {dare.status === "Approved" ? (
                    <Trophy className="mt-0.5 h-4 w-4 text-emerald-200" />
                  ) : (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-cyan-200" />
                  )}
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
                  {txLoading ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <Zap className="h-4 w-4" />
                  )}
                  {txLoading || "Claim this dare"}
                </button>
              ) : !wallet && !isLegacy && dare.status === "Open" ? (
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
                  {txLoading ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <Hourglass className="h-4 w-4" />
                  )}
                  {txLoading || "Finalize dare"}
                </button>
              ) : null}

              {canCancel ? (
                <button
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-300/20 bg-rose-300/10 px-4 py-3 text-sm font-semibold text-rose-100 transition hover:bg-rose-300/15 disabled:opacity-60"
                  disabled={!!txLoading}
                  onClick={() => void handleCancel()}
                >
                  {txLoading === "Cancelling dare..." ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <XCircle className="h-4 w-4" />
                  )}
                  {txLoading === "Cancelling dare..."
                    ? txLoading
                    : "Cancel dare and reclaim reward"}
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
              <div className="mt-4 rounded-2xl border border-rose-300/20 bg-rose-300/10 px-4 py-3 text-sm text-rose-100">
                {error}
              </div>
            ) : null}
          </section>

          <aside className="space-y-6">
            <section className="surface-panel px-6 py-6">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
                Lifecycle
              </p>
              <ol className="mt-4 space-y-4 text-sm leading-6 text-slate-300">
                <li>
                  <span className="font-semibold text-white">1.</span> Claim
                  before the deadline if you want the slot.
                </li>
                <li>
                  <span className="font-semibold text-white">2.</span> Submit
                  public proof once the challenge is completed.
                </li>
                <li>
                  <span className="font-semibold text-white">3.</span> Community
                  voters review the proof and cast a verdict.
                </li>
                <li>
                  <span className="font-semibold text-white">4.</span> Anyone
                  can finalize once the time window closes.
                </li>
              </ol>
            </section>

            {dare.status === "Voting" && !isLegacy ? (
              <section className="surface-panel px-6 py-6">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
                  Community vote
                </p>
                <h2 className="mt-2 text-xl font-semibold text-white">
                  Review the submitted proof
                </h2>
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

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-[1.25rem] border border-white/10 bg-slate-950/50 p-4">
      <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
        {label}
      </p>
      <div className="mt-2 text-sm font-medium text-slate-100">{value}</div>
    </div>
  );
}
