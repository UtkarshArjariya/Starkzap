"use client";

import { useState } from "react";

import { submitProof } from "@/lib/contract";
import { useContractAction } from "@/hooks/useContract";

type ProofModalProps = {
  dareId: bigint;
  onClose: () => void;
  onSubmitted: (hash: string) => void;
};

export default function ProofModal({ dareId, onClose, onSubmitted }: ProofModalProps) {
  const { withWallet, isPending, error } = useContractAction();
  const [proofUrl, setProofUrl] = useState("");
  const [proofDescription, setProofDescription] = useState("");

  async function handleSubmit() {
    const tx = await withWallet((wallet) =>
      submitProof(wallet, dareId, proofUrl.trim(), proofDescription.trim())
    );
    onSubmitted(tx.transaction_hash);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-[32px] border border-white/10 bg-zinc-950 p-6 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-white">Submit Proof</h2>
            <p className="mt-1 text-sm text-white/55">
              Share the public proof URL and a short explanation.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 px-3 py-1.5 text-sm text-white/70 transition hover:text-white"
          >
            Close
          </button>
        </div>

        <div className="space-y-4">
          <input
            value={proofUrl}
            onChange={(event) => setProofUrl(event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-white/30 focus:border-accent/40"
            placeholder="https://youtube.com/..."
          />
          <textarea
            rows={4}
            value={proofDescription}
            onChange={(event) => setProofDescription(event.target.value)}
            className="w-full rounded-3xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-white/30 focus:border-accent/40"
            placeholder="What did you do, and what should voters look for?"
          />
          {error ? (
            <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {error}
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={isPending || !proofUrl.trim() || !proofDescription.trim()}
            className="w-full rounded-full bg-sky-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "Submitting..." : "Submit Proof"}
          </button>
        </div>
      </div>
    </div>
  );
}
