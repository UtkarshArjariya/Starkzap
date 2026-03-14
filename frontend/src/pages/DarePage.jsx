import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { getDare, claimDare, finalizeDare } from "@/lib/contract";
import { getTokenSymbol, formatAmount, shortAddress, STARKSCAN_URL, addressesMatch } from "@/lib/config";
import { useWallet } from "@/context/WalletContext";
import Header from "@/components/Header";
import StatusBadge from "@/components/StatusBadge";
import CountdownTimer from "@/components/CountdownTimer";
import VotePanel from "@/components/VotePanel";
import ProofModal from "@/components/ProofModal";
import LoadingSpinner from "@/components/LoadingSpinner";
import { ArrowLeft, ExternalLink, Zap, Award, CheckCircle, Clock } from "lucide-react";

export default function DarePage() {
  const { id } = useParams();
  const { wallet, connect } = useWallet();

  const [dare, setDare] = useState(null);
  const [loading, setLoading] = useState(true);
  const [txLoading, setTxLoading] = useState("");
  const [txHash, setTxHash] = useState("");
  const [error, setError] = useState("");
  const [showProofModal, setShowProofModal] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await getDare(BigInt(id));
      setDare(d);
    } catch (e) {
      setError(e.message || "Failed to load dare");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, [load]);

  const handleClaim = async () => {
    setError("");
    setTxLoading("Claiming dare...");
    let w = wallet;
    if (!w) {
      try { w = await connect(); } catch (e) {
        setError(e.message || "Wallet connection failed");
        setTxLoading("");
        return;
      }
    }
    try {
      const hash = await claimDare(w, BigInt(id));
      setTxHash(hash);
      await load();
    } catch (e) {
      setError(e.message || "Transaction failed");
    } finally {
      setTxLoading("");
    }
  };

  const handleFinalize = async () => {
    setError("");
    setTxLoading("Finalizing dare...");
    let w = wallet;
    if (!w) {
      try { w = await connect(); } catch (e) {
        setError(e.message || "Wallet connection failed");
        setTxLoading("");
        return;
      }
    }
    try {
      const hash = await finalizeDare(w, BigInt(id));
      setTxHash(hash);
      await load();
    } catch (e) {
      setError(e.message || "Transaction failed");
    } finally {
      setTxLoading("");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F0F0F]">
        <Header />
        <div className="flex items-center justify-center py-32">
          <LoadingSpinner size="lg" text="Loading dare..." />
        </div>
      </div>
    );
  }

  if (!dare || error) {
    return (
      <div className="min-h-screen bg-[#0F0F0F]">
        <Header />
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <p className="text-red-400 mb-4" data-testid="dare-error">
            {error || "Dare not found"}
          </p>
          <Link to="/" className="text-purple-400 hover:text-purple-300 text-sm">
            ← Back to feed
          </Link>
        </div>
      </div>
    );
  }

  const now = Math.floor(Date.now() / 1000);
  const symbol = getTokenSymbol(dare.rewardToken);
  const amount = formatAmount(dare.rewardAmount);

  const isPoster   = wallet && addressesMatch(wallet.address, dare.poster);
  const isClaimer  = wallet && addressesMatch(wallet.address, dare.claimer);
  const canClaim   = dare.status === "Open" && !isPoster && now < dare.deadline;
  const canSubmit  = dare.status === "Claimed" && isClaimer;
  const canFinalize =
    (dare.status === "Voting" && now >= dare.votingEnd) ||
    ((dare.status === "Claimed" || dare.status === "Open") && now > dare.deadline);

  const isFinished =
    dare.status === "Approved" ||
    dare.status === "Rejected" ||
    dare.status === "Expired";

  return (
    <div className="min-h-screen bg-[#0F0F0F]" data-testid="dare-page">
      <Header />

      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Back */}
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-gray-500 hover:text-gray-300 text-sm mb-6 transition-colors"
        >
          <ArrowLeft size={14} />
          Back to feed
        </Link>

        {/* Main card */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-4">
            <h1 className="text-2xl font-bold text-white leading-snug flex-1">
              {dare.title}
            </h1>
            <StatusBadge status={dare.status} size="lg" />
          </div>

          {dare.description && (
            <p className="text-gray-400 leading-relaxed mb-6 text-sm sm:text-base">
              {dare.description}
            </p>
          )}

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-white/5 border border-white/10 rounded-xl p-3">
              <p className="text-xs text-gray-500 mb-1 uppercase tracking-wide">Reward</p>
              <p className="text-white font-semibold text-lg">
                {amount}{" "}
                <span className="text-gray-400 text-sm font-normal">{symbol}</span>
              </p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-3">
              <p className="text-xs text-gray-500 mb-1 uppercase tracking-wide">Posted by</p>
              <p className="text-white font-mono text-sm">{shortAddress(dare.poster)}</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-3">
              <p className="text-xs text-gray-500 mb-1 uppercase tracking-wide flex items-center gap-1">
                <Clock size={11} /> Deadline
              </p>
              <CountdownTimer targetTimestamp={dare.deadline} label="" compact />
              <p className="text-gray-500 text-xs mt-0.5">
                {new Date(dare.deadline * 1000).toLocaleDateString()}
              </p>
            </div>
            {dare.claimer &&
              dare.claimer !== "0x" + "0".repeat(64) &&
              dare.status !== "Open" && (
                <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                  <p className="text-xs text-gray-500 mb-1 uppercase tracking-wide">Claimer</p>
                  <p className="text-white font-mono text-sm">{shortAddress(dare.claimer)}</p>
                </div>
              )}
          </div>

          {/* Voting countdown */}
          {dare.status === "Voting" && dare.votingEnd > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 mb-4 flex items-center justify-between">
              <span className="text-amber-400 text-sm font-medium flex items-center gap-1.5">
                <Zap size={14} className="fill-amber-400" />
                Voting in progress
              </span>
              <CountdownTimer
                targetTimestamp={dare.votingEnd}
                label="Closes"
                compact
              />
            </div>
          )}

          {/* Finalized banner */}
          {isFinished && (
            <div
              className={`rounded-xl px-4 py-3 mb-4 flex items-center gap-2 text-sm font-medium
                ${dare.status === "Approved" ? "bg-purple-500/10 border border-purple-500/20 text-purple-400" : ""}
                ${dare.status === "Rejected" ? "bg-red-500/10 border border-red-500/20 text-red-400" : ""}
                ${dare.status === "Expired" ? "bg-gray-500/10 border border-gray-500/20 text-gray-400" : ""}
              `}
              data-testid="finalized-banner"
            >
              {dare.status === "Approved" ? (
                <>
                  <Award size={16} /> Dare approved — reward sent to claimer
                </>
              ) : dare.status === "Rejected" ? (
                <>
                  <CheckCircle size={16} /> Dare rejected — reward returned to poster
                </>
              ) : (
                <>
                  <Clock size={16} /> Dare expired — reward returned to poster
                </>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="space-y-3">
            {/* Claim */}
            {dare.status === "Open" && (
              canClaim ? (
                <button
                  onClick={handleClaim}
                  disabled={!!txLoading}
                  className="w-full py-3.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
                  data-testid="claim-dare-btn"
                >
                  {txLoading ? (
                    <><LoadingSpinner size="sm" />{txLoading}</>
                  ) : (
                    <><Zap size={16} className="fill-white" /> Claim This Dare</>
                  )}
                </button>
              ) : (
                !wallet && (
                  <button
                    onClick={() => connect()}
                    className="w-full py-3.5 bg-white/10 hover:bg-white/15 text-white rounded-xl font-medium transition-colors"
                    data-testid="connect-to-claim-btn"
                  >
                    Connect wallet to claim
                  </button>
                )
              )
            )}

            {/* Submit proof */}
            {canSubmit && (
              <button
                onClick={() => setShowProofModal(true)}
                className="w-full py-3.5 bg-blue-600/80 hover:bg-blue-600 text-white rounded-xl font-semibold transition-colors"
                data-testid="submit-proof-btn"
              >
                Submit Proof
              </button>
            )}

            {/* Finalize */}
            {canFinalize && (
              <button
                onClick={handleFinalize}
                disabled={!!txLoading}
                className="w-full py-3.5 bg-amber-600/80 hover:bg-amber-600 disabled:opacity-50 text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
                data-testid="finalize-dare-btn"
              >
                {txLoading ? (
                  <><LoadingSpinner size="sm" />{txLoading}</>
                ) : (
                  "Finalize Dare & Distribute Reward"
                )}
              </button>
            )}
          </div>

          {/* Tx hash */}
          {txHash && (
            <div className="mt-4 text-center">
              <a
                href={`${STARKSCAN_URL}/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-purple-400 hover:text-purple-300"
                data-testid="dare-tx-link"
              >
                View transaction on Starkscan <ExternalLink size={13} />
              </a>
            </div>
          )}

          {error && (
            <p className="mt-3 text-red-400 text-sm text-center" data-testid="dare-action-error">
              {error}
            </p>
          )}
        </div>

        {/* Voting section */}
        {dare.status === "Voting" && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6" data-testid="voting-section">
            <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
              <Zap size={16} className="text-amber-400" />
              Community Vote
            </h2>
            <VotePanel dare={dare} onVoted={load} />
          </div>
        )}
      </main>

      {/* Proof modal */}
      {showProofModal && (
        <ProofModal
          dareId={BigInt(id)}
          wallet={wallet}
          onConnect={connect}
          onSubmitted={() => { setShowProofModal(false); load(); }}
          onClose={() => setShowProofModal(false)}
        />
      )}
    </div>
  );
}
