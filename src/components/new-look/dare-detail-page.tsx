"use client";

import confetti from "canvas-confetti";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Calendar,
  Check,
  Clock,
  Copy,
  ExternalLink,
  Loader2,
  ThumbsDown,
  ThumbsUp,
  Trophy,
  User,
  XCircle,
  Zap,
} from "lucide-react";
import { ModernHeader } from "./header";
import VotePanel from "@/components/VotePanel";
import ProofModal from "@/components/ProofModal";
import CountdownTimer from "@/components/CountdownTimer";
import { useWallet } from "@/context/WalletContext";
import { useToast } from "@/context/ToastContext";
import {
  VOYAGER_URL,
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
import type { Dare, DareStatus } from "@/lib/types";

/* ── Status config ─────────────────────────────────────────────────── */
const STATUS_CONFIG: Record<
  DareStatus,
  { label: string; className: string; pulse: boolean }
> = {
  Open: {
    label: "Open",
    className:
      "border-[hsl(var(--success))]/40 bg-[hsl(var(--success))]/15 text-[hsl(var(--success))]",
    pulse: false,
  },
  Claimed: {
    label: "Claimed",
    className:
      "border-[hsl(var(--warning))]/40 bg-[hsl(var(--warning))]/15 text-[hsl(var(--warning))]",
    pulse: false,
  },
  Voting: {
    label: "Voting",
    className: "border-accent/40 bg-accent/15 text-accent",
    pulse: true,
  },
  Approved: {
    label: "Approved",
    className:
      "border-[hsl(var(--success))]/40 bg-[hsl(var(--success))]/15 text-[hsl(var(--success))]",
    pulse: false,
  },
  Rejected: {
    label: "Rejected",
    className: "border-destructive/40 bg-destructive/15 text-destructive",
    pulse: false,
  },
  Expired: {
    label: "Expired",
    className: "border-muted-foreground/30 bg-muted text-muted-foreground",
    pulse: false,
  },
  Cancelled: {
    label: "Cancelled",
    className: "border-orange-400/40 bg-orange-400/15 text-orange-400",
    pulse: false,
  },
};

/* ── Timeline ──────────────────────────────────────────────────────── */
function TimelineItem({
  label,
  sub,
  active,
  last,
}: {
  label: string;
  sub: string;
  active: boolean;
  last: boolean;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div
          className={`h-3 w-3 shrink-0 rounded-full ${active ? "bg-primary" : "bg-muted-foreground/30"}`}
        />
        {!last && <div className="mt-1 w-px flex-1 bg-border" />}
      </div>
      <div className="pb-5">
        <p
          className={`text-sm font-medium ${active ? "text-foreground" : "text-muted-foreground"}`}
        >
          {label}
        </p>
        <p className="text-xs text-muted-foreground">{sub}</p>
      </div>
    </div>
  );
}

/* ── Main component ────────────────────────────────────────────────── */
export function ModernDareDetailPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const legacyContract = searchParams.get("contract") ?? undefined;
  const { wallet, connect } = useWallet();
  const toast = useToast();

  const [dare, setDare] = useState<Dare | null>(null);
  const [loading, setLoading] = useState(true);
  const [txLoading, setTxLoading] = useState("");
  const [txHash, setTxHash] = useState("");
  const [error, setError] = useState("");
  const [showProofModal, setShowProofModal] = useState(false);
  const [copied, setCopied] = useState(false);
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
      const next = await getDare(dareId, legacyContract);
      setDare(next);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load dare");
    } finally {
      setLoading(false);
    }
  }, [dareId, legacyContract]);

  useEffect(() => {
    void loadDare();
    const interval = window.setInterval(() => void loadDare(), 10_000);
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

  /* ── Live clock (updates every 30s so canClaim/canFinalize stay fresh) */
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const timer = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 30_000);
    return () => clearInterval(timer);
  }, []);
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

  const totalVotes = dare ? dare.approveVotes + dare.rejectVotes : 0;
  const votePercent =
    totalVotes > 0 && dare
      ? Math.round((dare.approveVotes / totalVotes) * 100)
      : 50;

  const tags = dare ? extractTags(dare.description) : [];
  const cleanDescription = dare ? stripTags(dare.description) : "";
  const claimerVisible =
    dare?.claimer && dare.claimer !== ZERO_ADDRESS && dare.status !== "Open";

  /* ── Action handlers ─────────────────────────────────────────────── */
  const handleClaim = async () => {
    if (!dare || dareId === null) return;
    setError("");
    setTxLoading("Claiming dare…");
    try {
      const w = wallet ?? (await connect());
      if (!w) return;
      const hash = await claimDare(w, dareId);
      setTxHash(hash);
      toast.success("Dare claimed! Now go do it.", { txHash: hash });
      await loadDare();
    } catch (e) {
      const msg = decodeContractError(e);
      setError(msg);
      toast.error(msg);
    } finally {
      setTxLoading("");
    }
  };

  const handleFinalize = async () => {
    if (!dare || dareId === null) return;
    setError("");
    setTxLoading("Finalizing dare…");
    try {
      const w = wallet ?? (await connect());
      if (!w) return;
      const hash = await finalizeDare(w, dareId);
      setTxHash(hash);
      toast.success("Dare finalized — reward distributed.", { txHash: hash });
      await loadDare();
    } catch (e) {
      const msg = decodeContractError(e);
      setError(msg);
      toast.error(msg);
    } finally {
      setTxLoading("");
    }
  };

  const handleCancel = async () => {
    if (!dare || dareId === null) return;
    if (!window.confirm("Cancel this dare and reclaim the escrowed reward?"))
      return;
    setError("");
    setTxLoading("Cancelling dare…");
    try {
      const w = wallet ?? (await connect());
      if (!w) return;
      const hash = await cancelDare(w, dareId);
      setTxHash(hash);
      toast.success("Dare cancelled — reward returned to your wallet.", {
        txHash: hash,
      });
      await loadDare();
    } catch (e) {
      const msg = decodeContractError(e);
      setError(msg);
      toast.error(msg);
    } finally {
      setTxLoading("");
    }
  };

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  /* ── Loading ─────────────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-20 md:pb-0">
        <ModernHeader />
        <div className="flex items-center justify-center py-32">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  /* ── Error / not found ───────────────────────────────────────────── */
  if (!dare || (error && !dare)) {
    return (
      <div className="min-h-screen bg-background pb-20 md:pb-0">
        <ModernHeader />
        <main className="mx-auto max-w-lg px-4 py-24 text-center lg:px-8">
          <div className="rounded-[2rem] border border-border bg-card p-10">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/15">
              <XCircle className="h-7 w-7 text-destructive" />
            </div>
            <h2 className="mb-2 text-xl font-bold text-foreground">
              Dare not found
            </h2>
            <p className="mb-8 text-sm text-muted-foreground">
              {error || "This dare doesn't exist or has been removed."}
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Feed
            </Link>
          </div>
        </main>
      </div>
    );
  }

  /* ── Main render ─────────────────────────────────────────────────── */
  const statusCfg = STATUS_CONFIG[dare.status];

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <ModernHeader />

      {showProofModal && dareId !== null && (
        <ProofModal
          dareId={dareId}
          wallet={wallet}
          onConnect={connect}
          onSubmitted={() => {
            setShowProofModal(false);
            void loadDare();
          }}
          onClose={() => setShowProofModal(false)}
        />
      )}

      <main className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
        {/* Back */}
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Feed
        </Link>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* ── Left: main content ──────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header */}
            <div>
              <div className="mb-4 flex flex-wrap items-center gap-3">
                {/* Status badge */}
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium ${statusCfg.className}`}
                >
                  {statusCfg.pulse && (
                    <span className="h-2 w-2 animate-pulse rounded-full bg-current" />
                  )}
                  {statusCfg.label}
                </span>

                {/* Reward */}
                <div className="flex items-center gap-2 rounded-full bg-accent/15 px-4 py-1.5">
                  <Zap className="h-4 w-4 text-accent" />
                  <span className="text-lg font-bold text-accent">
                    {rewardAmount}
                  </span>
                  <span className="text-sm font-medium text-accent/80">
                    {symbol}
                  </span>
                </div>

                {isLegacy && (
                  <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-xs font-medium text-amber-200">
                    Legacy
                  </span>
                )}
              </div>

              <h1 className="mb-3 text-3xl font-bold tracking-tight text-foreground lg:text-4xl">
                {dare.title}
              </h1>
            </div>

            {/* Description */}
            <div className="rounded-2xl border border-border bg-card p-6">
              <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Description
              </p>
              <p className="mt-3 leading-relaxed text-foreground">
                {cleanDescription}
              </p>
              {tags.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {tags.map((t) => (
                    <span
                      key={t}
                      className="rounded-full bg-secondary px-3 py-1 text-sm font-medium text-secondary-foreground"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Voting bar (Voting status) */}
            {dare.status === "Voting" && totalVotes > 0 && (
              <div className="rounded-2xl border border-accent/30 bg-accent/5 p-5">
                <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-accent">
                  Community Verdict
                </p>
                <div className="mb-3 flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5 font-medium text-[hsl(var(--success))]">
                    <ThumbsUp className="h-4 w-4" />
                    {dare.approveVotes} Approve ({votePercent}%)
                  </span>
                  <span className="flex items-center gap-1.5 font-medium text-destructive">
                    {dare.rejectVotes} Reject ({100 - votePercent}%)
                    <ThumbsDown className="h-4 w-4" />
                  </span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-destructive/25">
                  <div
                    className="h-full rounded-full bg-[hsl(var(--success))] transition-all duration-500"
                    style={{ width: `${votePercent}%` }}
                  />
                </div>
                <p className="mt-2 text-center text-xs text-muted-foreground">
                  {totalVotes} total vote{totalVotes !== 1 ? "s" : ""}
                </p>
              </div>
            )}

            {/* Vote panel */}
            {dare.status === "Voting" && (
              <VotePanel dare={dare} onVoted={() => void loadDare()} />
            )}

            {/* Winner card (Approved) */}
            {dare.status === "Approved" && claimerVisible && (
              <div className="rounded-2xl border border-[hsl(var(--success))]/30 bg-gradient-to-br from-[hsl(var(--success))]/15 via-card to-primary/10 p-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[hsl(var(--success))]/20">
                    <Trophy className="h-7 w-7 text-[hsl(var(--success))]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-foreground">
                      Winner!
                    </h3>
                    <p className="font-mono text-sm text-muted-foreground">
                      {shortAddress(dare.claimer)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs text-muted-foreground">Payout</p>
                    <p className="text-2xl font-bold text-[hsl(var(--success))]">
                      {rewardAmount} {symbol}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            {/* Tx hash */}
            {txHash && (
              <a
                href={`${VOYAGER_URL}/tx/${txHash}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <ExternalLink className="h-4 w-4 shrink-0" />
                <span className="truncate font-mono">{txHash}</span>
              </a>
            )}

            {/* Action buttons */}
            <div className="flex flex-wrap gap-3">
              {canClaim && (
                <button
                  disabled={!!txLoading}
                  onClick={() => void handleClaim()}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-4 font-semibold text-primary-foreground transition-all hover:-translate-y-0.5 hover:opacity-95 disabled:translate-y-0 disabled:opacity-50"
                >
                  {txLoading === "Claiming dare…" ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Zap className="h-5 w-5" />
                  )}
                  {txLoading === "Claiming dare…"
                    ? "Claiming…"
                    : "Claim This Dare"}
                </button>
              )}

              {canSubmitProof && (
                <button
                  disabled={!!txLoading}
                  onClick={() => setShowProofModal(true)}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-accent px-6 py-4 font-semibold text-accent-foreground transition-all hover:-translate-y-0.5 hover:opacity-95 disabled:translate-y-0 disabled:opacity-50"
                >
                  <Zap className="h-5 w-5" />
                  Submit Proof
                </button>
              )}

              {canFinalize && (
                <button
                  disabled={!!txLoading}
                  onClick={() => void handleFinalize()}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[hsl(var(--success))] px-6 py-4 font-semibold text-white transition-all hover:-translate-y-0.5 hover:opacity-95 disabled:translate-y-0 disabled:opacity-50"
                >
                  {txLoading === "Finalizing dare…" ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Trophy className="h-5 w-5" />
                  )}
                  {txLoading === "Finalizing dare…"
                    ? "Finalizing…"
                    : "Finalize & Distribute"}
                </button>
              )}

              {canCancel && (
                <button
                  disabled={!!txLoading}
                  onClick={() => void handleCancel()}
                  className="flex items-center justify-center gap-2 rounded-2xl border border-destructive/40 bg-destructive/10 px-6 py-4 font-semibold text-destructive transition-colors hover:bg-destructive/20 disabled:opacity-50"
                >
                  {txLoading === "Cancelling dare…" ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <XCircle className="h-5 w-5" />
                  )}
                  {txLoading === "Cancelling dare…"
                    ? "Cancelling…"
                    : "Cancel Dare"}
                </button>
              )}

              {/* Copy link */}
              <button
                onClick={() => void handleCopyLink()}
                className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-secondary px-5 py-4 font-medium text-foreground transition-colors hover:bg-secondary/80"
              >
                {copied ? (
                  <Check className="h-5 w-5 text-[hsl(var(--success))]" />
                ) : (
                  <Copy className="h-5 w-5" />
                )}
                {copied ? "Copied!" : "Share"}
              </button>
            </div>
          </div>

          {/* ── Right: sidebar ──────────────────────────────────────── */}
          <div className="space-y-6">
            {/* Info card */}
            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Details
              </p>
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <User className="h-4 w-4 shrink-0" />
                    <span className="text-sm">Posted by</span>
                  </div>
                  <a
                    href={`${VOYAGER_URL}/contract/${dare.poster}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-sm text-foreground transition-colors hover:text-primary"
                  >
                    {shortAddress(dare.poster)}
                  </a>
                </div>

                {claimerVisible && (
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Zap className="h-4 w-4 shrink-0" />
                      <span className="text-sm">Claimed by</span>
                    </div>
                    <a
                      href={`${VOYAGER_URL}/contract/${dare.claimer}`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-sm text-foreground transition-colors hover:text-primary"
                    >
                      {shortAddress(dare.claimer)}
                    </a>
                  </div>
                )}

                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4 shrink-0" />
                    <span className="text-sm">Deadline</span>
                  </div>
                  <span className="text-sm text-foreground">
                    {new Date(dare.deadline * 1000).toLocaleDateString()}
                  </span>
                </div>

                {dare.status !== "Approved" &&
                  dare.status !== "Rejected" &&
                  dare.status !== "Expired" && (
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-4 w-4 shrink-0" />
                        <span className="text-sm">
                          {dare.status === "Voting"
                            ? "Voting ends"
                            : "Time left"}
                        </span>
                      </div>
                      <div className="text-sm font-semibold text-[hsl(var(--warning))]">
                        <CountdownTimer
                          targetTimestamp={
                            dare.status === "Voting" && dare.votingEnd
                              ? dare.votingEnd
                              : dare.deadline
                          }
                          compact
                        />
                      </div>
                    </div>
                  )}

                {dare.contractAddress && (
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <ExternalLink className="h-4 w-4 shrink-0" />
                      <span className="text-sm">Contract</span>
                    </div>
                    <a
                      href={`${VOYAGER_URL}/contract/${dare.contractAddress}`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-sm text-primary transition-colors hover:underline"
                    >
                      {shortAddress(dare.contractAddress)}
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Activity timeline */}
            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Activity
              </p>
              <div>
                <TimelineItem
                  label="Dare posted"
                  sub={`by ${shortAddress(dare.poster)}`}
                  active={true}
                  last={dare.status === "Open" || dare.status === "Expired"}
                />
                {dare.status !== "Open" && dare.status !== "Expired" && (
                  <TimelineItem
                    label="Dare claimed"
                    sub={
                      claimerVisible ? `by ${shortAddress(dare.claimer)}` : ""
                    }
                    active={true}
                    last={dare.status === "Claimed"}
                  />
                )}
                {(dare.status === "Voting" ||
                  dare.status === "Approved" ||
                  dare.status === "Rejected") && (
                  <TimelineItem
                    label="Proof submitted"
                    sub={
                      dare.proofSubmittedAt > 0
                        ? new Date(
                            dare.proofSubmittedAt * 1000,
                          ).toLocaleDateString()
                        : ""
                    }
                    active={true}
                    last={dare.status === "Voting"}
                  />
                )}
                {(dare.status === "Approved" || dare.status === "Rejected") && (
                  <TimelineItem
                    label={
                      dare.status === "Approved"
                        ? "Dare approved 🎉"
                        : "Dare rejected"
                    }
                    sub="Community voted"
                    active={true}
                    last={true}
                  />
                )}
                {dare.status === "Expired" && (
                  <TimelineItem
                    label="Dare expired"
                    sub="No one claimed in time"
                    active={false}
                    last={true}
                  />
                )}
              </div>
            </div>

            {/* Proof preview (if voting) */}
            {dare.status === "Voting" && dare.proofUrl && (
              <div className="rounded-2xl border border-accent/30 bg-accent/5 p-5">
                <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-accent">
                  Submitted Proof
                </p>
                {dare.proofDescription && (
                  <p className="mb-3 text-sm text-muted-foreground">
                    {dare.proofDescription}
                  </p>
                )}
                <a
                  href={dare.proofUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-secondary px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary/80"
                >
                  <ExternalLink className="h-4 w-4" />
                  View Proof
                </a>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
