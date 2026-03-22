"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Plus, RefreshCcw, Sparkles, Zap } from "lucide-react";
import DareCard, { DareCardSkeleton } from "@/components/DareCard";
import DareOfTheDay from "@/components/DareOfTheDay";
import Header from "@/components/Header";
import { ModernFeedPage } from "@/components/new-look/feed-page";
import { useUI } from "@/context/UIContext";
import { getDaresPaginated } from "@/lib/contract";
import { CATEGORIES, extractTags } from "@/lib/categories";

import type { Dare, DareStatus } from "@/lib/types";

const PAGE_SIZE = 20;
const POLL_INTERVAL = 15_000;

const FILTERS: Array<DareStatus | "All"> = [
  "All",
  "Open",
  "Claimed",
  "Voting",
  "Approved",
  "Rejected",
  "Expired",
];

export default function FeedPage() {
  const { mode } = useUI();

  if (mode === "modern") return <ModernFeedPage />;

  return <ClassicFeedPage />;
}

function ClassicFeedPage() {
  const [dares, setDares] = useState<Dare[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [filter, setFilter] = useState<DareStatus | "All">("All");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load / silently refresh page 1
  const loadPage1 = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const result = await getDaresPaginated(1, PAGE_SIZE);
      setDares(result.dares);
      setTotal(result.total);
      setHasMore(result.hasMore);
      setCurrentPage(1);
      setError("");
    } catch (err) {
      if (!silent) {
        setError(err instanceof Error ? err.message : "Failed to load dares");
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  // Append additional pages
  const loadMore = useCallback(async () => {
    setLoadingMore(true);
    try {
      const nextPage = currentPage + 1;
      const result = await getDaresPaginated(nextPage, PAGE_SIZE);
      setDares((prev) => [...prev, ...result.dares]);
      setHasMore(result.hasMore);
      setCurrentPage(nextPage);
    } catch {
      // silently ignore; user can retry by clicking Load more again
    } finally {
      setLoadingMore(false);
    }
  }, [currentPage]);

  useEffect(() => {
    void loadPage1();
  }, [loadPage1]);

  // 15s poll — only refreshes page 1 silently
  useEffect(() => {
    intervalRef.current = setInterval(() => void loadPage1(true), POLL_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [loadPage1]);

  const filteredDares = useMemo(() => {
    let result = dares;
    if (filter !== "All") {
      result = result.filter((dare) => dare.status === filter);
    }
    if (categoryFilter) {
      result = result.filter((dare) => extractTags(dare.description).includes(categoryFilter));
    }
    return result;
  }, [dares, filter, categoryFilter]);

  return (
    <div className="min-h-screen overflow-x-hidden">
      <Header />

      <main className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6">
        {/* Hero */}
        <section className="surface-panel relative overflow-hidden px-6 py-8 sm:px-8 sm:py-10">
          <div className="absolute inset-0 bg-hero-mesh opacity-90" />
          <div className="absolute -right-14 top-0 h-40 w-40 rounded-full bg-cyan-300/10 blur-3xl" />
          <div className="absolute -bottom-20 left-0 h-52 w-52 rounded-full bg-fuchsia-300/10 blur-3xl" />

          <div className="relative z-10 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs uppercase tracking-[0.22em] text-cyan-100">
                <Sparkles className="h-3.5 w-3.5" />
                On-chain social challenges
              </div>
              <h1 className="mt-5 max-w-xl text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-5xl">
                Turn internet dares into transparent Starknet bounties.
              </h1>
              <p className="mt-4 max-w-xl text-base leading-7 text-slate-300 sm:text-lg">
                Post a public challenge, lock the reward on-chain, and let the
                community verify the proof. No moderators, no spreadsheets, no
                hidden payout logic.
              </p>
              <div className="mt-6 flex flex-wrap gap-3 text-sm text-slate-300">
                <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2">
                  <span className="font-semibold text-white">{total}</span>{" "}
                  total dares
                </div>
                <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2">
                  <span className="font-semibold text-white">
                    {dares.filter((dare) => dare.status === "Voting").length}
                  </span>{" "}
                  under review
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                className="inline-flex items-center justify-center gap-2 rounded-full bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
                href="/create"
              >
                <Plus className="h-4 w-4" />
                Post a dare
              </Link>
              <a
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/10"
                href="https://sepolia.voyager.online"
                rel="noreferrer"
                target="_blank"
              >
                <Zap className="h-4 w-4 text-cyan-200" />
                Explore Voyager
              </a>
            </div>
          </div>
        </section>

        {/* Dare of the Day */}
        <DareOfTheDay />

        {/* Filters */}
        <section className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-4">
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
            {FILTERS.map((tab) => (
              <button
                key={tab}
                className={
                  filter === tab
                    ? "shrink-0 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950"
                    : "shrink-0 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-400 transition hover:border-cyan-300/20 hover:text-white"
                }
                onClick={() => setFilter(tab)}
              >
                {tab}
              </button>
            ))}
          </div>

          <p className="text-sm text-slate-500">Auto-refreshes every 15 s</p>
        </section>

        {/* Category filter chips */}
        <section className="mt-3 -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
          <button
            className={
              categoryFilter === null
                ? "shrink-0 rounded-full bg-fuchsia-500/20 border border-fuchsia-300/30 px-3 py-1.5 text-xs font-medium text-fuchsia-100"
                : "shrink-0 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-400 transition hover:text-white"
            }
            onClick={() => setCategoryFilter(null)}
          >
            All categories
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.name}
              className={
                categoryFilter === cat.name
                  ? "shrink-0 rounded-full bg-fuchsia-500/20 border border-fuchsia-300/30 px-3 py-1.5 text-xs font-medium text-fuchsia-100"
                  : "shrink-0 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-400 transition hover:text-white"
              }
              onClick={() => setCategoryFilter(cat.name)}
            >
              {cat.emoji} {cat.name}
            </button>
          ))}
        </section>

        {/* Grid */}
        <section className="mt-6">
          {loading ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <DareCardSkeleton key={i} />
              ))}
            </div>
          ) : error ? (
            <div className="surface-panel px-6 py-12 text-center">
              <p className="text-lg font-semibold text-white">
                Could not connect to Starknet
              </p>
              <p className="mt-2 text-sm text-slate-400">{error}</p>
              <button
                className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/10"
                onClick={() => void loadPage1()}
              >
                <RefreshCcw className="h-4 w-4" />
                Retry
              </button>
            </div>
          ) : filteredDares.length === 0 ? (
            <div className="surface-panel px-6 py-12 text-center">
              <p className="text-lg font-semibold text-white">
                {filter === "All"
                  ? "No dares yet"
                  : `No ${filter.toLowerCase()} dares right now`}
              </p>
              <p className="mt-2 text-sm text-slate-400">
                {filter === "All"
                  ? "Be the first to set the tone and lock a reward."
                  : "Try another filter or post a fresh challenge."}
              </p>
              {filter === "All" ? (
                <Link
                  className="mt-5 inline-flex items-center gap-2 rounded-full bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
                  href="/create"
                >
                  <Plus className="h-4 w-4" />
                  Post the first dare
                </Link>
              ) : (
                <button
                  className="mt-5 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/10"
                  onClick={() => setFilter("All")}
                >
                  Clear filter
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="grid gap-4 lg:grid-cols-2">
                {filteredDares.map((dare) => (
                  <DareCard dare={dare} key={dare.id.toString()} />
                ))}
              </div>

              {/* Load more — only shown when not filtering (filter is client-side on loaded data) */}
              {filter === "All" && hasMore ? (
                <div className="mt-6 flex justify-center">
                  <button
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-6 py-3 text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
                    disabled={loadingMore}
                    onClick={() => void loadMore()}
                  >
                    {loadingMore ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : null}
                    {loadingMore
                      ? "Loading..."
                      : `Load more (${total - dares.length} remaining)`}
                  </button>
                </div>
              ) : null}
            </>
          )}
        </section>
      </main>
    </div>
  );
}
