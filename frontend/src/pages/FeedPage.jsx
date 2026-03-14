import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { getAllDares } from "@/lib/contract";
import { CONTRACT_ADDRESS } from "@/lib/config";
import DareCard from "@/components/DareCard";
import Header from "@/components/Header";
import LoadingSpinner from "@/components/LoadingSpinner";
import { Zap, Plus } from "lucide-react";

const FILTER_TABS = ["All", "Open", "Voting", "Approved", "Rejected"];

export default function FeedPage() {
  const [dares, setDares] = useState([]);
  const [filter, setFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!CONTRACT_ADDRESS) {
      setError("Contract not yet deployed. Set REACT_APP_CONTRACT_ADDRESS in .env.");
      setLoading(false);
      return;
    }
    try {
      const all = await getAllDares();
      setDares(all);
      setError("");
    } catch (e) {
      setError(e.message || "Failed to load dares");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [load]);

  const filtered =
    filter === "All" ? dares : dares.filter((d) => d.status === filter);

  return (
    <div className="min-h-screen bg-[#0F0F0F]" data-testid="feed-page">
      <Header />

      {/* Hero banner */}
      <div className="relative overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-transparent to-transparent pointer-events-none" />
        <div className="max-w-5xl mx-auto px-4 py-10 sm:py-14">
          <div className="flex items-center gap-2 mb-3">
            <Zap size={16} className="text-purple-400" />
            <span className="text-purple-400 text-sm font-medium uppercase tracking-wider">
              Starknet Sepolia
            </span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-3 leading-tight">
            Dare Board
          </h1>
          <p className="text-gray-400 text-base sm:text-lg max-w-xl">
            Post dares with on-chain rewards. Claim them, submit proof, let the
            community decide. Gasless. No wallet needed.
          </p>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          {/* Filter tabs */}
          <div className="flex flex-wrap gap-2" data-testid="filter-tabs">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                data-testid={`filter-tab-${tab.toLowerCase()}`}
                className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-all duration-150 ${
                  filter === tab
                    ? "bg-purple-600 text-white shadow-sm shadow-purple-900/40"
                    : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/10"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Post CTA */}
          <Link
            to="/create"
            data-testid="post-dare-btn"
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-5 py-2 rounded-xl text-sm font-medium transition-colors shadow-md shadow-purple-900/30"
          >
            <Plus size={16} />
            Post a Dare
          </Link>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <LoadingSpinner size="lg" text="Loading dares from chain..." />
          </div>
        ) : error ? (
          <div
            className="text-center py-20"
            data-testid="feed-error"
          >
            <div className="inline-block bg-red-500/10 border border-red-500/20 rounded-2xl px-8 py-6 max-w-md">
              <p className="text-red-400 text-sm leading-relaxed">{error}</p>
              {!CONTRACT_ADDRESS && (
                <p className="text-gray-500 text-xs mt-3">
                  Deploy the contract first, then update{" "}
                  <code className="text-purple-400">REACT_APP_CONTRACT_ADDRESS</code> in{" "}
                  <code className="text-purple-400">frontend/.env</code>
                </p>
              )}
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24" data-testid="empty-feed">
            <div className="inline-block">
              <Zap size={40} className="text-gray-700 mx-auto mb-4" />
              <p className="text-gray-500 text-base mb-2">
                {filter === "All"
                  ? "No dares yet."
                  : `No ${filter.toLowerCase()} dares.`}
              </p>
              <p className="text-gray-600 text-sm mb-6">
                {filter === "All" ? "Be the first to post a dare and lock a reward!" : "Try a different filter."}
              </p>
              {filter === "All" && (
                <Link
                  to="/create"
                  className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors"
                >
                  <Plus size={16} />
                  Post the first dare
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-2" data-testid="dare-grid">
            {filtered.map((dare) => (
              <DareCard key={dare.id.toString()} dare={dare} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
