import { useState } from "react";
import { submitProof } from "@/lib/contract";
import { STARKSCAN_URL } from "@/lib/config";
import { X, ExternalLink, CheckCircle, Link as LinkIcon } from "lucide-react";
import LoadingSpinner from "./LoadingSpinner";

export default function ProofModal({ dareId, wallet, onConnect, onSubmitted, onClose }) {
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
    let w = wallet;
    if (!w) {
      try { w = await onConnect(); } catch { setLoading(false); return; }
    }
    try {
      const hash = await submitProof(w, dareId, proofUrl.trim(), description.trim());
      setTxHash(hash);
      setTimeout(() => onSubmitted?.(), 2500);
    } catch (e) {
      setError(e.message || "Transaction failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      data-testid="proof-modal"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-[#161616] border border-white/15 rounded-2xl p-6 w-full max-w-md shadow-2xl shadow-black/50 animate-in fade-in slide-in-from-bottom-4 duration-200">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
          data-testid="proof-modal-close"
        >
          <X size={18} />
        </button>

        <h2 className="text-lg font-semibold text-white mb-1">Submit Proof</h2>
        <p className="text-gray-500 text-sm mb-5">
          Share a link (YouTube, Twitter, Imgur) proving you completed the dare.
        </p>

        {txHash ? (
          <div className="text-center py-4 space-y-3">
            <div className="flex items-center justify-center gap-2 text-green-400">
              <CheckCircle size={22} />
              <span className="font-medium">Proof submitted!</span>
            </div>
            <a
              href={`${STARKSCAN_URL}/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-purple-400 hover:text-purple-300"
              data-testid="proof-tx-link"
            >
              View on Starkscan <ExternalLink size={13} />
            </a>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Proof URL */}
            <div>
              <label className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wider">
                Proof URL *
              </label>
              <div className="relative">
                <LinkIcon
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                />
                <input
                  type="url"
                  placeholder="https://twitter.com/... or YouTube link"
                  value={proofUrl}
                  onChange={(e) => setProofUrl(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-purple-500/50 focus:bg-white/8 transition-colors"
                  data-testid="proof-url-input"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wider">
                What did you do? (optional)
              </label>
              <textarea
                rows={3}
                placeholder="Briefly describe what you did and how it proves the dare..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={500}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-purple-500/50 focus:bg-white/8 transition-colors resize-none"
                data-testid="proof-description-input"
              />
              <div className="text-xs text-gray-600 text-right mt-1">
                {description.length}/500
              </div>
            </div>

            {error && (
              <p className="text-red-400 text-sm" data-testid="proof-error">
                {error}
              </p>
            )}

            <button
              onClick={handleSubmit}
              disabled={loading || !proofUrl.trim()}
              className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
              data-testid="proof-submit-btn"
            >
              {loading ? (
                <>
                  <LoadingSpinner size="sm" />
                  Submitting on-chain...
                </>
              ) : (
                "Submit Proof"
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
