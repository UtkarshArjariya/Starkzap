import { useState, useEffect } from "react";
import { useWallet } from "@/context/WalletContext";
import { castVote, hasVoterVoted } from "@/lib/contract";
import { addressesMatch, shortAddress, STARKSCAN_URL } from "@/lib/config";
import { ThumbsUp, ThumbsDown, ExternalLink, CheckCircle } from "lucide-react";
import LoadingSpinner from "./LoadingSpinner";

export default function VotePanel({ dare, onVoted }) {
  const { wallet, connect } = useWallet();
  const [voted, setVoted] = useState(false);
  const [txHash, setTxHash] = useState("");
  const [loading, setLoading] = useState("");
  const [error, setError] = useState("");
  const [checkingVote, setCheckingVote] = useState(true);

  const totalVotes = dare.approveVotes + dare.rejectVotes;
  const approvePercent = totalVotes > 0 ? Math.round((dare.approveVotes / totalVotes) * 100) : 0;

  const isPoster  = wallet && addressesMatch(wallet.address, dare.poster);
  const isClaimer = wallet && addressesMatch(wallet.address, dare.claimer);
  const canVote   = wallet && !isPoster && !isClaimer && !voted;

  useEffect(() => {
    if (!wallet?.address || !dare?.id) {
      setCheckingVote(false);
      return;
    }
    setCheckingVote(true);
    hasVoterVoted(dare.id, wallet.address)
      .then((v) => setVoted(v))
      .catch(() => {})
      .finally(() => setCheckingVote(false));
  }, [wallet?.address, dare?.id]);

  const handleVote = async (approve) => {
    setError("");
    let w = wallet;
    if (!w) {
      try { w = await connect(); } catch { return; }
    }
    setLoading(approve ? "Approving..." : "Rejecting...");
    try {
      const hash = await castVote(w, dare.id, approve);
      setTxHash(hash);
      setVoted(true);
      onVoted?.();
    } catch (e) {
      setError(e.message || "Transaction failed");
    } finally {
      setLoading("");
    }
  };

  return (
    <div className="space-y-4" data-testid="vote-panel">
      {/* Proof link */}
      {dare.proofUrl && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1 uppercase tracking-wider">Proof</p>
          <a
            href={dare.proofUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-purple-400 hover:text-purple-300 text-sm font-medium transition-colors break-all"
            data-testid="proof-url-link"
          >
            {dare.proofUrl}
            <ExternalLink size={13} />
          </a>
          {dare.proofDescription && (
            <p className="text-gray-400 text-sm mt-2 leading-relaxed">
              {dare.proofDescription}
            </p>
          )}
        </div>
      )}

      {/* Vote tally */}
      <div data-testid="vote-tally">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-green-400 font-medium">
            {dare.approveVotes} Approve
          </span>
          <span className="text-gray-500 text-xs self-center">
            {totalVotes} vote{totalVotes !== 1 ? "s" : ""}
          </span>
          <span className="text-red-400 font-medium">
            {dare.rejectVotes} Reject
          </span>
        </div>
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-green-600 to-green-400 rounded-full transition-all duration-700"
            style={{ width: totalVotes > 0 ? `${approvePercent}%` : "50%" }}
          />
        </div>
        {totalVotes === 0 && (
          <p className="text-xs text-gray-600 text-center mt-1">No votes yet — be the first</p>
        )}
      </div>

      {/* Constraint notices */}
      {isPoster && (
        <p className="text-xs text-amber-400/80 text-center bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
          You posted this dare — voting not allowed
        </p>
      )}
      {isClaimer && (
        <p className="text-xs text-amber-400/80 text-center bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
          You claimed this dare — voting not allowed
        </p>
      )}

      {/* Already voted */}
      {voted && !loading && (
        <div
          className="flex items-center justify-center gap-2 text-green-400 text-sm bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3"
          data-testid="already-voted-msg"
        >
          <CheckCircle size={16} />
          Vote recorded on-chain
          {txHash && (
            <a
              href={`${STARKSCAN_URL}/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-400 hover:text-purple-300 ml-1"
            >
              <ExternalLink size={13} />
            </a>
          )}
        </div>
      )}

      {/* Vote buttons */}
      {!voted && !isPoster && !isClaimer && !checkingVote && (
        <>
          {!wallet ? (
            <button
              onClick={() => connect()}
              className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium transition-colors"
              data-testid="connect-to-vote-btn"
            >
              Connect wallet to vote
            </button>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleVote(true)}
                disabled={!!loading}
                className="flex items-center justify-center gap-2 py-3 bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 text-green-400 rounded-xl font-medium transition-colors disabled:opacity-50"
                data-testid="approve-vote-btn"
              >
                {loading === "Approving..." ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <ThumbsUp size={16} />
                )}
                Approve
              </button>
              <button
                onClick={() => handleVote(false)}
                disabled={!!loading}
                className="flex items-center justify-center gap-2 py-3 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-400 rounded-xl font-medium transition-colors disabled:opacity-50"
                data-testid="reject-vote-btn"
              >
                {loading === "Rejecting..." ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <ThumbsDown size={16} />
                )}
                Reject
              </button>
            </div>
          )}
        </>
      )}

      {loading && (
        <div className="flex items-center justify-center gap-2 text-gray-400 text-sm">
          <LoadingSpinner size="sm" />
          {loading}
        </div>
      )}

      {error && (
        <p className="text-red-400 text-sm text-center" data-testid="vote-error">
          {error}
        </p>
      )}
    </div>
  );
}
