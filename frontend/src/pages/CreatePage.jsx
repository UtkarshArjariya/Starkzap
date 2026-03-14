import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useWallet } from "@/context/WalletContext";
import { createDare, TOKENS } from "@/lib/contract";
import { STARKSCAN_URL } from "@/lib/config";
import Header from "@/components/Header";
import LoadingSpinner from "@/components/LoadingSpinner";
import { ArrowLeft, ExternalLink, CheckCircle, Lock } from "lucide-react";

const MIN_DATETIME = () => {
  const d = new Date(Date.now() + 3700 * 1000);
  return d.toISOString().slice(0, 16);
};

export default function CreatePage() {
  const navigate = useNavigate();
  const { wallet, connect } = useWallet();

  const [form, setForm] = useState({
    title: "",
    description: "",
    rewardToken: TOKENS.STRK,
    rewardAmount: "",
    deadline: "",
  });
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState("");
  const [error, setError] = useState("");

  const update = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async () => {
    // Validation
    if (!form.title.trim()) return setError("Title is required");
    if (form.title.length > 31) return setError("Title max 31 characters (felt252 limit)");
    if (!form.rewardAmount || parseFloat(form.rewardAmount) <= 0)
      return setError("Reward amount must be > 0");
    if (!form.deadline) return setError("Deadline is required");

    const deadlineDate = new Date(form.deadline);
    if (deadlineDate.getTime() < Date.now() + 3600_000)
      return setError("Deadline must be at least 1 hour from now");

    setError("");
    setLoading(true);

    let w = wallet;
    if (!w) {
      try { w = await connect(); } catch (e) {
        setError(e.message || "Wallet connection failed");
        setLoading(false);
        return;
      }
    }

    try {
      const hash = await createDare(w, {
        title: form.title.trim(),
        description: form.description.trim(),
        rewardToken: form.rewardToken,
        rewardAmount: form.rewardAmount,
        deadline: deadlineDate,
      });
      setTxHash(hash);
      setTimeout(() => navigate("/"), 4000);
    } catch (e) {
      setError(e.message || "Transaction failed");
    } finally {
      setLoading(false);
    }
  };

  const tokenSymbol = form.rewardToken === TOKENS.STRK ? "STRK" : "ETH";

  return (
    <div className="min-h-screen bg-[#0F0F0F]" data-testid="create-page">
      <Header />

      <main className="max-w-xl mx-auto px-4 py-10">
        {/* Back link */}
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-gray-500 hover:text-gray-300 text-sm mb-6 transition-colors"
          data-testid="back-to-feed"
        >
          <ArrowLeft size={14} />
          Back to feed
        </Link>

        <h1 className="text-3xl font-bold text-white mb-2">Post a Dare</h1>
        <p className="text-gray-500 text-sm mb-8">
          Lock a reward in escrow. Someone will claim it — if the community approves their
          proof, they get paid.
        </p>

        {txHash ? (
          // Success state
          <div
            className="bg-green-500/10 border border-green-500/20 rounded-2xl p-6 text-center space-y-3"
            data-testid="create-success"
          >
            <CheckCircle size={36} className="text-green-400 mx-auto" />
            <p className="text-white font-semibold text-lg">Dare posted!</p>
            <p className="text-gray-400 text-sm">
              Your reward is locked in escrow. Redirecting to feed...
            </p>
            <a
              href={`${STARKSCAN_URL}/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-purple-400 hover:text-purple-300 text-sm"
              data-testid="create-tx-link"
            >
              View on Starkscan <ExternalLink size={13} />
            </a>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Title */}
            <div>
              <label className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wider">
                Dare Title *
              </label>
              <input
                type="text"
                placeholder="e.g. Do 100 push-ups on camera"
                maxLength={31}
                value={form.title}
                onChange={update("title")}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-purple-500/50 focus:bg-white/8 transition-colors"
                data-testid="title-input"
              />
              <div className="flex justify-between mt-1">
                <span className="text-xs text-gray-600">felt252 limit: 31 chars ASCII</span>
                <span className="text-xs text-gray-600">{form.title.length}/31</span>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wider">
                Description (optional)
              </label>
              <textarea
                rows={4}
                placeholder="Describe exactly what the claimer needs to do to earn the reward..."
                maxLength={500}
                value={form.description}
                onChange={update("description")}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-purple-500/50 focus:bg-white/8 transition-colors resize-none"
                data-testid="description-input"
              />
              <div className="text-xs text-gray-600 text-right mt-1">
                {form.description.length}/500
              </div>
            </div>

            {/* Reward */}
            <div>
              <label className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wider">
                Reward *
              </label>
              <div className="flex gap-2">
                <select
                  value={form.rewardToken}
                  onChange={update("rewardToken")}
                  className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-purple-500/50 cursor-pointer"
                  data-testid="token-select"
                >
                  <option value={TOKENS.STRK}>STRK</option>
                  <option value={TOKENS.ETH}>ETH</option>
                </select>
                <input
                  type="number"
                  placeholder="0.00"
                  min="0.000001"
                  step="0.01"
                  value={form.rewardAmount}
                  onChange={update("rewardAmount")}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-purple-500/50 focus:bg-white/8 transition-colors"
                  data-testid="reward-amount-input"
                />
              </div>
              <p className="text-xs text-gray-600 mt-1">
                This amount will be locked in escrow until the dare is finalized.
              </p>
            </div>

            {/* Deadline */}
            <div>
              <label className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wider">
                Deadline *
              </label>
              <input
                type="datetime-local"
                min={MIN_DATETIME()}
                value={form.deadline}
                onChange={update("deadline")}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-purple-500/50 focus:bg-white/8 transition-colors"
                data-testid="deadline-input"
              />
              <p className="text-xs text-gray-600 mt-1">Minimum 1 hour from now</p>
            </div>

            {/* Error */}
            {error && (
              <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3" data-testid="create-error">
                {error}
              </p>
            )}

            {/* Summary */}
            {form.title && form.rewardAmount && (
              <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl px-4 py-3 text-sm text-purple-300">
                <p className="font-medium mb-1">Transaction preview:</p>
                <p className="text-purple-400/80 text-xs">
                  Approve {form.rewardAmount} {tokenSymbol} → then call{" "}
                  <code className="text-purple-300">create_dare()</code> — gasless multicall
                </p>
              </div>
            )}

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={loading || !form.title || !form.rewardAmount || !form.deadline}
              className="w-full py-3.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
              data-testid="submit-dare-btn"
            >
              {loading ? (
                <>
                  <LoadingSpinner size="sm" />
                  Sending transaction...
                </>
              ) : (
                <>
                  <Lock size={16} />
                  Post Dare & Lock {form.rewardAmount || "0"} {tokenSymbol}
                </>
              )}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
