"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Loader2, Plus } from "lucide-react";
import { ModernHeader } from "./header";
import { ModernDareCard, ModernDareCardSkeleton } from "./dare-card";
import { Hero } from "./feed/hero";
import { LiveTicker } from "./feed/live-ticker";
import { FeaturedDare } from "./feed/featured-dare";
import { Filters } from "./feed/filters";
import { HowItWorks } from "./feed/how-it-works";
import { getDaresPaginated } from "@/lib/contract";
import { extractTags } from "@/lib/categories";
import type { Dare, DareStatus } from "@/lib/types";

const PAGE_SIZE = 20;
const POLL_INTERVAL = 15_000;

export function ModernFeedPage() {
  const [dares, setDares] = useState<Dare[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [filter, setFilter] = useState<DareStatus | "All">("All");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  const loadMore = useCallback(async () => {
    setLoadingMore(true);
    try {
      const nextPage = currentPage + 1;
      const result = await getDaresPaginated(nextPage, PAGE_SIZE);
      setDares((prev) => [...prev, ...result.dares]);
      setHasMore(result.hasMore);
      setCurrentPage(nextPage);
    } catch {
      // silently ignore
    } finally {
      setLoadingMore(false);
    }
  }, [currentPage]);

  useEffect(() => {
    void loadPage1();
  }, [loadPage1]);

  useEffect(() => {
    intervalRef.current = setInterval(() => void loadPage1(true), POLL_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [loadPage1]);

  const filteredDares = useMemo(() => {
    let result = dares;
    if (filter !== "All") {
      result = result.filter((d) => d.status === filter);
    }
    if (categoryFilter) {
      result = result.filter((d) => extractTags(d.description).includes(categoryFilter));
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((d) => d.title.toLowerCase().includes(q) || d.description.toLowerCase().includes(q));
    }
    return result;
  }, [dares, filter, categoryFilter, searchQuery]);

  // Pick a featured dare (highest reward open dare)
  const featuredDare = useMemo(() => {
    const openDares = dares.filter((d) => d.status === "Open" && !d.legacy);
    if (openDares.length === 0) return null;
    return openDares.reduce((best, d) => (d.rewardAmount > best.rewardAmount ? d : best), openDares[0]);
  }, [dares]);

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <ModernHeader />
      <Hero totalDares={total} />
      <LiveTicker dares={dares} />
      {featuredDare && <FeaturedDare dare={featuredDare} />}
      <HowItWorks />

      <Filters
        activeStatus={filter}
        onStatusChange={setFilter}
        activeCategory={categoryFilter}
        onCategoryChange={setCategoryFilter}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      <section className="mx-auto max-w-7xl px-4 pb-12 lg:px-8">
        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <ModernDareCardSkeleton key={i} />
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center rounded-[2rem] border border-border bg-card p-12 text-center">
            <h3 className="mb-2 text-xl font-semibold text-foreground">Could not connect to Starknet</h3>
            <p className="mb-6 text-muted-foreground">{error}</p>
            <button
              onClick={() => void loadPage1()}
              className="rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground"
            >
              Retry
            </button>
          </div>
        ) : filteredDares.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-[2rem] border border-border bg-card p-12 text-center">
            <h3 className="mb-2 text-xl font-semibold text-foreground">No dares found</h3>
            <p className="mb-6 text-muted-foreground">
              Try adjusting your filters or be the first to post a dare!
            </p>
            <Link href="/create" className="rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground">
              <Plus className="mr-2 inline h-4 w-4" />
              Post a Dare
            </Link>
          </div>
        ) : (
          <>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredDares.map((dare) => (
                <ModernDareCard key={`${dare.contractAddress || "c"}-${dare.id.toString()}`} dare={dare} />
              ))}
            </div>

            {filter === "All" && hasMore && (
              <div className="mt-8 flex justify-center">
                <button
                  onClick={() => void loadMore()}
                  disabled={loadingMore}
                  className="flex items-center gap-2 rounded-full border border-border bg-secondary px-8 py-3 font-medium text-foreground transition-colors hover:bg-secondary/80 disabled:opacity-50"
                >
                  {loadingMore ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    `Load More (${total - dares.length} remaining)`
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
