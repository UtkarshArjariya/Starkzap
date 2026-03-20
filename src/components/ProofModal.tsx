"use client";

import { useState } from "react";
import { CheckCircle2, ExternalLink, Link as LinkIcon, X } from "lucide-react";
import LoadingSpinner from "@/components/LoadingSpinner";
import { VOYAGER_URL } from "@/lib/config";
import { submitProof } from "@/lib/contract";
import { decodeContractError } from "@/lib/utils";
import type { WalletAccount } from "@/lib/types";

type ProofModalProps = {
  dareId: bigint;
  wallet: WalletAccount | null;
  onConnect: () => Promise<WalletAccount>;
  onSubmitted: () => void;
  onClose: () => void;
};

export default function ProofModal({
  dareId,
  wallet,
  onConnect,
  onSubmitted,
  onClose,
}: ProofModalProps) {
  const [proofUrl, setProofUrl] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!proofUrl.trim()) {
      setError("Proof URL is required");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const activeWallet = wallet ?? (await onConnect());
      const hash = await submitProof(activeWallet, dareId, proofUrl.trim(), description.trim());
      setTxHash(hash);
      window.setTimeout(onSubmitted, 1800);
    } catch (submitError) {
      setError(decodeContractError(submitError));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:px-4">
      <button className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 max-h-[90vh] w-full overflow-y-auto rounded-t-[1.75rem] border border-white/10 bg-slate-950/95 p-6 shadow-glow sm:max-w-lg sm:rounded-[1.75rem]">
        <button className="absolute right-4 top-4 text-slate-500 transition hover:text-white" onClick={onClose}>
          <X className="h-5 w-5" />
        </button>

        <p className="text-xs uppercase tracking-[0.22em] text-cyan-200/80">Submit proof</p>
        <h2 className="mt-2 text-2xl font-semibold text-white">Show the community you actually did it</h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          Paste a public proof link and explain what viewers should look for before they vote.
        </p>

        {txHash ? (
          <div className="mt-6 rounded-[1.5rem] border border-emerald-300/20 bg-emerald-300/10 p-5 text-center">
            <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-200" />
            <p className="mt-3 text-lg font-semibold text-white">Proof submitted</p>
            <a
              className="mt-3 inline-flex items-center gap-1.5 text-sm text-cyan-200 transition hover:text-white"
              href={`${VOYAGER_URL}/tx/${txHash}`}
              rel="noreferrer"
              target="_blank"
            >
              View transaction on Voyager
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            <div>
              <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-slate-500">Proof URL</label>
              <div className="relative">
                <LinkIcon className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300/30"
                  onChange={(event) => setProofUrl(event.target.value)}
                  placeholder="https://youtube.com/... or https://x.com/..."
                  type="url"
                  value={proofUrl}
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-slate-500">What happened?</label>
              <textarea
                className="min-h-32 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300/30"
                maxLength={500}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Give voters the context they need to judge your proof fairly."
                value={description}
              />
              <p className="mt-1 text-right text-xs text-slate-500">{description.length}/500</p>
            </div>

            {error ? (
              <div className="rounded-2xl border border-rose-300/20 bg-rose-300/10 px-4 py-3 text-sm text-rose-100">
                {error}
              </div>
            ) : null}

            <button
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:opacity-60"
              disabled={loading || !proofUrl.trim()}
              onClick={() => void handleSubmit()}
            >
              {loading ? <LoadingSpinner size="sm" /> : null}
              {loading ? "Submitting on-chain..." : "Submit proof"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
