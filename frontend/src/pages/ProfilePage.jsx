import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { getAllDares } from "@/lib/contract";
import { addressesMatch } from "@/lib/config";
import { useWallet } from "@/context/WalletContext";
import Header from "@/components/Header";
import DareCard from "@/components/DareCard";
import LoadingSpinner from "@/components/LoadingSpinner";
import { User, FileText, Trophy, Zap } from "lucide-react";

export default function ProfilePage() {
  const { wallet, connect } = useWallet();
  const [tab, setTab] = useState("posted");
  const [allDares, setAllDares] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const dares = await getAllDares();
      setAllDares(dares);
    } catch (e) {
      setError(e.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!wallet) {
    return (
      <div className="min-h-screen bg-[#0F0F0F]" data-testid="profile-page">
        <Header />
        <div className="flex flex-col items-center justify-center py-32 px-4 text-center">
          <User size={40} className="text-gray-700 mb-4" />
          <h2 className="text-white text-xl font-semibold mb-2">Connect your wallet</h2>
          <p className="text-gray-500 text-sm mb-6">
            Connect to see your posted dares and claims.
          </p>
          <button
            onClick={() => connect()}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-6 py-2.5 rounded-xl font-medium transition-colors"
            data-testid="profile-connect-btn"
          >
            <Zap size={16} />
            Connect Wallet
          </button>
        </div>
      </div>
    );
  }

  const posted = allDares.filter((d) => addressesMatch(d.poster, wallet.address));
  const claimed = allDares.filter(
    (d) => d.claimer && addressesMatch(d.claimer, wallet.address)
  );

  const displayed = tab === "posted" ? posted : claimed;

  return (
    <div className="min-h-screen bg-[#0F0F0F]" data-testid="profile-page">
      <Header />

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Profile header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-full bg-purple-600/20 border border-purple-500/30 flex items-center justify-center">
            <User size={22} className="text-purple-400" />
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-0.5">Connected as</p>
            <p className="text-white font-mono text-sm font-medium">
              {wallet.address?.slice(0, 10)}...{wallet.address?.slice(-8)}
            </p>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
            <FileText size={20} className="text-purple-400 mx-auto mb-1" />
            <p className="text-white text-2xl font-bold">{posted.length}</p>
            <p className="text-gray-500 text-xs">Dares posted</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
            <Trophy size={20} className="text-amber-400 mx-auto mb-1" />
            <p className="text-white text-2xl font-bold">{claimed.length}</p>
            <p className="text-gray-500 text-xs">Dares claimed</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6" data-testid="profile-tabs">
          <button
            onClick={() => setTab("posted")}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              tab === "posted"
                ? "bg-purple-600 text-white"
                : "bg-white/5 text-gray-400 hover:text-white border border-white/10"
            }`}
            data-testid="tab-my-dares"
          >
            My Dares ({posted.length})
          </button>
          <button
            onClick={() => setTab("claimed")}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              tab === "claimed"
                ? "bg-purple-600 text-white"
                : "bg-white/5 text-gray-400 hover:text-white border border-white/10"
            }`}
            data-testid="tab-my-claims"
          >
            My Claims ({claimed.length})
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner size="lg" text="Loading..." />
          </div>
        ) : error ? (
          <p className="text-red-400 text-sm text-center py-12">{error}</p>
        ) : displayed.length === 0 ? (
          <div className="text-center py-16" data-testid="profile-empty">
            <p className="text-gray-500 mb-4">
              {tab === "posted"
                ? "You haven't posted any dares yet."
                : "You haven't claimed any dares yet."}
            </p>
            <Link
              to={tab === "posted" ? "/create" : "/"}
              className="inline-flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300"
            >
              {tab === "posted" ? "Post your first dare →" : "Browse open dares →"}
            </Link>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2" data-testid="profile-dare-grid">
            {displayed.map((d) => (
              <DareCard key={d.id.toString()} dare={d} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
