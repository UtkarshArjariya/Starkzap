"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Loader2,
  Shield,
  ShieldAlert,
  TriangleAlert,
} from "lucide-react";
import Header from "@/components/Header";
import StarknetAddress from "@/components/StarknetAddress";
import { useToast } from "@/context/ToastContext";
import { useWallet } from "@/context/WalletContext";
import {
  ADMIN_ADDRESS,
  addressesMatch,
  formatAmount,
  getTokenDecimals,
  getTokenSymbol,
} from "@/lib/config";
import {
  delistDare,
  getAllDares,
  isDelisted,
  relistDare,
} from "@/lib/contract";
import type { Dare } from "@/lib/types";
import { decodeContractError } from "@/lib/utils";

type Filter = "all" | "listed" | "delisted";

function statusTone(status: Dare["status"]) {
  switch (status) {
    case "Open":
      return "bg-emerald-500/15 text-emerald-300 border border-emerald-400/20";
    case "Claimed":
      return "bg-amber-500/15 text-amber-300 border border-amber-400/20";
    case "Voting":
      return "bg-cyan-500/15 text-cyan-300 border border-cyan-400/20";
    case "Approved":
      return "bg-green-500/15 text-green-300 border border-green-400/20";
    case "Rejected":
      return "bg-rose-500/15 text-rose-300 border border-rose-400/20";
    case "Expired":
      return "bg-slate-500/15 text-slate-300 border border-slate-400/20";
    default:
      return "bg-slate-500/15 text-slate-300 border border-slate-400/20";
  }
}

function SectionCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.08),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] shadow-[0_0_0_1px_rgba(255,255,255,0.02)] backdrop-blur ${className}`}
    >
      {children}
    </section>
  );
}

function FilterPill({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      className={
        active
          ? "rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950 shadow-sm"
          : "rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-400 transition hover:border-cyan-300/20 hover:bg-white/10 hover:text-white"
      }
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <SectionCard className="px-6 py-12 text-center">
      <p className="text-lg font-semibold text-white">{title}</p>
      <p className="mt-2 text-sm text-slate-400">{description}</p>
    </SectionCard>
  );
}

function ConnectState({ onConnect }: { onConnect: () => void }) {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-4xl px-4 py-24 text-center sm:px-6">
        <SectionCard className="px-6 py-12">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-rose-400/20 bg-rose-400/10">
            <ShieldAlert className="h-8 w-8 text-rose-300" />
          </div>
          <h1 className="mt-6 text-3xl font-semibold text-white">
            Admin Access Required
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            Connect the admin wallet to access moderation controls and listing
            management.
          </p>
          <button
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
            onClick={onConnect}
          >
            <Shield className="h-4 w-4" />
            Connect wallet
          </button>
        </SectionCard>
      </main>
    </div>
  );
}

function AccessDeniedState({ address }: { address: string }) {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-4xl px-4 py-24 text-center sm:px-6">
        <SectionCard className="px-6 py-12">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-rose-400/20 bg-rose-400/10">
            <ShieldAlert className="h-8 w-8 text-rose-300" />
          </div>
          <h1 className="mt-6 text-3xl font-semibold text-white">
            Access Denied
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            This page is only accessible to the contract admin wallet.
          </p>
          <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
              Connected account
            </p>
            <div className="mt-2 text-sm text-slate-300">
              <StarknetAddress address={address} className="text-slate-300" />
            </div>
          </div>
        </SectionCard>
      </main>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "cyan" | "emerald" | "rose" | "amber";
}) {
  const toneClass =
    tone === "cyan"
      ? "border-cyan-300/20 bg-cyan-300/10 text-cyan-100"
      : tone === "emerald"
        ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-100"
        : tone === "rose"
          ? "border-rose-300/20 bg-rose-300/10 text-rose-100"
          : "border-amber-300/20 bg-amber-300/10 text-amber-100";

  return (
    <div className={`rounded-2xl border px-4 py-4 ${toneClass}`}>
      <p className="text-xs uppercase tracking-[0.2em] opacity-70">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function AdminDareRow({
  dare,
  delisted,
  isLoading,
  legacy,
  onDelist,
  onRelist,
}: {
  dare: Dare;
  delisted: boolean;
  isLoading: boolean;
  legacy?: boolean;
  onDelist?: (dare: Dare) => void;
  onRelist?: (dare: Dare) => void;
}) {
  const key = dare.id.toString();
  const amount = formatAmount(
    dare.rewardAmount,
    getTokenDecimals(dare.rewardToken),
  );
  const symbol = getTokenSymbol(dare.rewardToken);
  const href = legacy
    ? `/dare/${dare.id.toString()}?contract=${dare.contractAddress}`
    : `/dare/${dare.id.toString()}`;

  return (
    <div
      className={`group flex flex-col gap-4 rounded-[1.5rem] border px-4 py-4 transition sm:flex-row sm:items-center ${
        legacy
          ? "border-amber-300/15 bg-amber-300/5"
          : delisted
            ? "border-rose-300/20 bg-rose-300/5"
            : "border-white/10 bg-white/[0.03] hover:border-cyan-300/20 hover:bg-white/[0.05]"
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-mono text-slate-400">
            #{key}
          </span>

          <span
            className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${statusTone(dare.status)}`}
          >
            {dare.status}
          </span>

          {legacy ? (
            <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-2.5 py-1 text-[11px] font-medium text-amber-200">
              Legacy
            </span>
          ) : null}

          {!legacy && delisted ? (
            <span className="rounded-full border border-rose-400/20 bg-rose-400/10 px-2.5 py-1 text-[11px] font-medium text-rose-200">
              Delisted
            </span>
          ) : null}
        </div>

        <p className="mt-3 truncate text-sm font-semibold text-white sm:text-base">
          {dare.title}
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
          <span>
            {amount} {symbol}
          </span>
          <span>•</span>
          <span>
            Poster:{" "}
            <StarknetAddress address={dare.poster} className="text-slate-400" />
          </span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Link
          href={href}
          className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
        >
          <Eye className="h-3.5 w-3.5" />
          View
        </Link>

        {!legacy ? (
          delisted ? (
            <button
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300/20 bg-emerald-300/10 px-3 py-2 text-xs font-medium text-emerald-200 transition hover:bg-emerald-300/20 disabled:opacity-50"
              disabled={isLoading}
              onClick={() => onRelist?.(dare)}
            >
              {isLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Eye className="h-3.5 w-3.5" />
              )}
              Relist
            </button>
          ) : (
            <button
              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-300/20 bg-rose-300/10 px-3 py-2 text-xs font-medium text-rose-200 transition hover:bg-rose-300/20 disabled:opacity-50"
              disabled={isLoading}
              onClick={() => onDelist?.(dare)}
            >
              {isLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <EyeOff className="h-3.5 w-3.5" />
              )}
              Delist
            </button>
          )
        ) : null}
      </div>
    </div>
  );
}

export default function AdminPage() {
  const { wallet, connect } = useWallet();
  const toast = useToast();

  const [dares, setDares] = useState<Dare[]>([]);
  const [delistedMap, setDelistedMap] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

  const isAdmin = useMemo(
    () => !!wallet && addressesMatch(wallet.address, ADMIN_ADDRESS),
    [wallet],
  );

  const loadDares = useCallback(async () => {
    try {
      const allDares = await getAllDares(true);
      setDares(allDares);

      const currentDares = allDares.filter((d) => !d.legacy);
      const statuses = await Promise.all(
        currentDares.map(async (d) => {
          try {
            const delisted = await isDelisted(d.id);
            return [d.id.toString(), delisted] as const;
          } catch {
            return [d.id.toString(), false] as const;
          }
        }),
      );

      setDelistedMap(Object.fromEntries(statuses));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load dares");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (isAdmin) {
      void loadDares();
    }
  }, [isAdmin, loadDares]);

  const handleDelist = useCallback(
    async (dare: Dare) => {
      if (!wallet) return;
      const key = dare.id.toString();
      setActionLoading(key);

      try {
        const hash = await delistDare(wallet, dare.id);
        setDelistedMap((prev) => ({ ...prev, [key]: true }));
        toast.success(`Dare #${key} delisted`, { txHash: hash });
      } catch (err) {
        toast.error(decodeContractError(err));
      } finally {
        setActionLoading(null);
      }
    },
    [wallet, toast],
  );

  const handleRelist = useCallback(
    async (dare: Dare) => {
      if (!wallet) return;
      const key = dare.id.toString();
      setActionLoading(key);

      try {
        const hash = await relistDare(wallet, dare.id);
        setDelistedMap((prev) => ({ ...prev, [key]: false }));
        toast.success(`Dare #${key} relisted`, { txHash: hash });
      } catch (err) {
        toast.error(decodeContractError(err));
      } finally {
        setActionLoading(null);
      }
    },
    [wallet, toast],
  );

  const currentDares = useMemo(() => dares.filter((d) => !d.legacy), [dares]);
  const legacyDares = useMemo(() => dares.filter((d) => d.legacy), [dares]);

  const listedCount = useMemo(
    () => currentDares.filter((d) => !delistedMap[d.id.toString()]).length,
    [currentDares, delistedMap],
  );

  const delistedCount = useMemo(
    () => currentDares.filter((d) => delistedMap[d.id.toString()]).length,
    [currentDares, delistedMap],
  );

  const filteredDares = useMemo(() => {
    if (filter === "listed") {
      return currentDares.filter((d) => !delistedMap[d.id.toString()]);
    }

    if (filter === "delisted") {
      return currentDares.filter((d) => delistedMap[d.id.toString()]);
    }

    return currentDares;
  }, [currentDares, delistedMap, filter]);

  if (!wallet) {
    return <ConnectState onConnect={() => void connect()} />;
  }

  if (!isAdmin) {
    return <AccessDeniedState address={wallet.address} />;
  }

  return (
    <div className="min-h-screen">
      <Header />

      <main className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6">
        <Link
          className="inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"
          href="/"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to feed
        </Link>

        <SectionCard className="mt-6 px-6 py-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10">
                <Shield className="h-6 w-6 text-cyan-200" />
              </div>

              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-cyan-200/80">
                  Admin controls
                </p>
                <h1 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">
                  Moderate board visibility
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
                  Delist harmful or inappropriate dares from the current board
                  while preserving their on-chain history. Legacy dares remain
                  read-only.
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <StatCard
                label="Current dares"
                tone="cyan"
                value={currentDares.length}
              />
              <StatCard label="Listed" tone="emerald" value={listedCount} />
              <StatCard label="Delisted" tone="rose" value={delistedCount} />
            </div>
          </div>
        </SectionCard>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <FilterPill
            active={filter === "all"}
            onClick={() => setFilter("all")}
          >
            All ({currentDares.length})
          </FilterPill>
          <FilterPill
            active={filter === "listed"}
            onClick={() => setFilter("listed")}
          >
            Listed ({listedCount})
          </FilterPill>
          <FilterPill
            active={filter === "delisted"}
            onClick={() => setFilter("delisted")}
          >
            Delisted ({delistedCount})
          </FilterPill>
        </div>

        <div className="mt-6">
          {loading ? (
            <SectionCard className="flex min-h-64 items-center justify-center px-6 py-12">
              <div className="flex items-center gap-3 text-slate-300">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm font-medium">Loading dares…</span>
              </div>
            </SectionCard>
          ) : filteredDares.length === 0 ? (
            <EmptyState
              description={
                filter === "delisted"
                  ? "No dares have been delisted."
                  : filter === "listed"
                    ? "No active listed dares found."
                    : "No dares found on the current contract."
              }
              title="Nothing to review"
            />
          ) : (
            <div className="space-y-3">
              {filteredDares.map((dare) => {
                const key = dare.id.toString();
                const delisted = delistedMap[key] ?? false;
                const isLoading = actionLoading === key;

                return (
                  <AdminDareRow
                    dare={dare}
                    delisted={delisted}
                    isLoading={isLoading}
                    key={key}
                    onDelist={handleDelist}
                    onRelist={handleRelist}
                  />
                );
              })}
            </div>
          )}
        </div>

        {!loading && legacyDares.length > 0 ? (
          <SectionCard className="mt-8 px-6 py-6">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl border border-amber-300/20 bg-amber-300/10">
                <TriangleAlert className="h-5 w-5 text-amber-200" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-white">
                  Legacy Dares
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  {legacyDares.length} dare{legacyDares.length !== 1 ? "s" : ""}{" "}
                  from previous contracts. These remain visible for historical
                  context and cannot be moderated from this panel.
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {legacyDares.map((dare) => (
                <AdminDareRow
                  dare={dare}
                  delisted={false}
                  isLoading={false}
                  key={`legacy-${dare.contractAddress}-${dare.id.toString()}`}
                  legacy
                />
              ))}
            </div>
          </SectionCard>
        ) : null}
      </main>
    </div>
  );
}
