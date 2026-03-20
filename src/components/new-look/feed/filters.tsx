"use client";

import { useState } from "react";
import { Search, X } from "lucide-react";
import type { DareStatus } from "@/lib/types";
import { CATEGORIES } from "@/lib/categories";

interface FiltersProps {
  activeStatus: DareStatus | "All";
  onStatusChange: (status: DareStatus | "All") => void;
  activeCategory: string | null;
  onCategoryChange: (category: string | null) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusCounts?: Partial<Record<DareStatus | "All", number>>;
}

const STATUS_FILTERS: Array<DareStatus | "All"> = ["All", "Open", "Claimed", "Voting", "Approved", "Rejected", "Expired"];

export function Filters({
  activeStatus,
  onStatusChange,
  activeCategory,
  onCategoryChange,
  searchQuery,
  onSearchChange,
  statusCounts,
}: FiltersProps) {
  const [showSearch, setShowSearch] = useState(false);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 lg:px-8">
      <div className="mb-4 flex items-center gap-2 overflow-x-auto pb-2">
        {STATUS_FILTERS.map((filter) => (
          <button
            key={filter}
            onClick={() => onStatusChange(filter)}
            className={`relative flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all ${
              activeStatus === filter
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
            }`}
          >
            {filter}
            {statusCounts?.[filter] != null && (
              <span className={`rounded-full px-1.5 py-0.5 text-xs ${
                activeStatus === filter
                  ? "bg-primary-foreground/20 text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}>
                {statusCounts[filter]}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          {showSearch || searchQuery ? (
            <div className="flex items-center gap-2 rounded-full border border-border bg-secondary px-4 py-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search dares..."
                className="w-40 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none lg:w-56"
                autoFocus
              />
              {searchQuery && (
                <button onClick={() => { onSearchChange(""); setShowSearch(false); }} className="text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={() => setShowSearch(true)}
              className="flex items-center gap-2 rounded-full border border-border bg-secondary px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary/80 hover:text-foreground"
            >
              <Search className="h-4 w-4" />
              <span className="hidden sm:inline">Search</span>
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onCategoryChange(null)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium capitalize transition-all ${
              activeCategory === null
                ? "bg-accent text-accent-foreground"
                : "bg-secondary text-muted-foreground hover:bg-secondary/80"
            }`}
          >
            All
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.name}
              onClick={() => onCategoryChange(cat.name)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium capitalize transition-all ${
                activeCategory === cat.name
                  ? "bg-accent text-accent-foreground"
                  : "bg-secondary text-muted-foreground hover:bg-secondary/80"
              }`}
            >
              {cat.emoji} {cat.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
