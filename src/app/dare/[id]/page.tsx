"use client";

import { useParams } from "next/navigation";
import { useState } from "react";

import ProofModal from "@/components/ProofModal";
import StatusBadge from "@/components/StatusBadge";
import VotePanel from "@/components/VotePanel";
import {
  claimDare,
  finalizeDare,
  getExplorerTransactionUrl,
} from "@/lib/contract";
import { useWallet } from "@/lib/starkzap";
import { useDare } from "@/hooks/useDare";
import { useContractAction } from "@/hooks/useContract";
import {
  addressesEqual,
  canFinalizeDare,
  formatTimestamp,
  getCountdownLabel,
  shortenAddress,
} from "@/lib/utils";

export default function DareDetailPage() {
  const params = useParams<{ id: string }>();
  const { address } = useWallet();
  const { dare, isLoading, error, refresh } = useDare(params.id, address);
  const { withWallet, isPending, error: actionError } = useContractAction();
  const [proofOpen, setProofOpen] = useState(false);
  const [lastTxHash, setLastTxHash] = useState<string | null>(null);

  if (isLoading) {
    return <PageState label="Loading dare..." />;
  }

  if (error || !dare) {
    return <PageState label={error ?? "Dare not found."} />;
  }

  const activeDare = dare;
  const isPoster =
    !!address && addressesEqual(address, activeDare.poster);
  const isClaimer =
    !!address && addressesEqual(address, activeDare.claimer);

  async function handleClaim() {
    const tx = await withWallet((wallet) => claimDare(wallet, activeDare.id));
    setLastTxHash(tx.transaction_hash);
    await refresh();
  }

  async function handleFinalize() {
    const tx = await withWallet((wallet) =>
      finalizeDare(wallet, activeDare.id),
    );
    setLastTxHash(tx.transaction_hash);
    await refresh();
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <section className="rounded-[36px] border border-white/10 bg-white/[0.04] p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="mb-3 text-xs uppercase tracking-[0.28em] text-white/40">
              Dare #{dare.id.toString()}
            </p>
            <h1 className="text-4xl font-semibold text-white">
              {activeDare.title}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-white/68">
              {activeDare.description}
            </p>
          </div>
          <StatusBadge status={activeDare.status} />
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Posted by"
            value={shortenAddress(activeDare.poster)}
          />
          <MetricCard label="Reward" value={activeDare.rewardAmountFormatted} />
          <MetricCard
            label="Deadline"
            value={formatTimestamp(activeDare.deadline)}
          />
          <MetricCard
            label={activeDare.status === "Voting" ? "Voting ends" : "Countdown"}
            value={getCountdownLabel(
              activeDare.status === "Voting"
                ? activeDare.votingEnd
                : activeDare.deadline,
            )}
          />
        </div>

        {activeDare.proofUrl ? (
          <div className="mt-8 rounded-[28px] border border-white/10 bg-black/20 p-5">
            <p className="text-xs uppercase tracking-[0.22em] text-white/40">
              Proof
            </p>
            <a
              href={activeDare.proofUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-3 block text-base font-semibold text-accent-soft underline-offset-4 hover:underline"
            >
              {activeDare.proofUrl}
            </a>
            <p className="mt-3 text-sm leading-6 text-white/70">
              {activeDare.proofDescription}
            </p>
          </div>
        ) : null}

        <div className="mt-8 flex flex-wrap gap-3">
          {activeDare.status === "Open" && !isPoster ? (
            <button
              type="button"
              onClick={() => void handleClaim()}
              disabled={isPending}
              className="rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white transition hover:bg-accent-dark disabled:opacity-60"
            >
              {isPending ? "Claiming..." : "Claim This Dare"}
            </button>
          ) : null}

          {activeDare.status === "Claimed" && isClaimer ? (
            <button
              type="button"
              onClick={() => setProofOpen(true)}
              className="rounded-full bg-sky-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-400"
            >
              Submit Proof
            </button>
          ) : null}

          {canFinalizeDare(activeDare) ? (
            <button
              type="button"
              onClick={() => void handleFinalize()}
              disabled={isPending}
              className="rounded-full bg-amber-500 px-5 py-3 text-sm font-semibold text-black transition hover:bg-amber-400 disabled:opacity-60"
            >
              {isPending ? "Finalizing..." : "Finalize Dare"}
            </button>
          ) : null}
        </div>

        {activeDare.status === "Voting" ? (
          <div className="mt-8">
            <VotePanel dare={activeDare} onVoted={refresh} />
          </div>
        ) : null}

        {actionError ? (
          <p className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {actionError}
          </p>
        ) : null}

        {lastTxHash ? (
          <a
            href={getExplorerTransactionUrl(lastTxHash)}
            target="_blank"
            rel="noreferrer"
            className="mt-6 inline-flex rounded-full border border-emerald-400/30 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-200"
          >
            View last transaction
          </a>
        ) : null}
      </section>

      {proofOpen ? (
        <ProofModal
          dareId={activeDare.id}
          onClose={() => setProofOpen(false)}
          onSubmitted={async (hash) => {
            setLastTxHash(hash);
            setProofOpen(false);
            await refresh();
          }}
        />
      ) : null}
    </main>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-white/40">
        {label}
      </p>
      <p className="mt-3 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function PageState({ label }: { label: string }) {
  return (
    <main className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      <div className="rounded-[32px] border border-white/10 bg-white/[0.04] px-6 py-20 text-center text-white/55">
        {label}
      </div>
    </main>
  );
}
