"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Eye, EyeOff, Shield, ShieldAlert } from "lucide-react";
import Header from "@/components/Header";
import LoadingSpinner from "@/components/LoadingSpinner";
import StarknetAddress from "@/components/StarknetAddress";
import { useWallet } from "@/context/WalletContext";
import { useToast } from "@/context/ToastContext";
import { ADMIN_ADDRESS, addressesMatch, formatAmount, getTokenDecimals, getTokenSymbol } from "@/lib/config";
import { getAllDares, isDelisted, delistDare, relistDare } from "@/lib/contract";
import { decodeContractError } from "@/lib/utils";
import type { Dare } from "@/lib/types";

export default function AdminPage() {
  const { wallet, connect } = useWallet();
  const toast = useToast();
  const [dares, setDares] = useState<Dare[]>([]);
  const [delistedMap, setDelistedMap] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "listed" | "delisted">("all");

  const isAdmin = useMemo(
    () => wallet && addressesMatch(wallet.address, ADMIN_ADDRESS),
    [wallet],
  );

  const loadDares = useCallback(async () => {
    try {
      const allDares = await getAllDares(true);
      setDares(allDares);

      // Check delisted status for non-legacy dares
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
    if (isAdmin) void loadDares();
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

  const filteredDares = useMemo(() => {
    const currentOnly = dares.filter((d) => !d.legacy);
    if (filter === "delisted") return currentOnly.filter((d) => delistedMap[d.id.toString()]);
    if (filter === "listed") return currentOnly.filter((d) => !delistedMap[d.id.toString()]);
    return currentOnly;
  }, [dares, delistedMap, filter]);

  // Not connected
  if (!wallet) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="mx-auto max-w-4xl px-4 py-24 text-center sm:px-6">
          <div className="surface-panel px-6 py-12">
            <ShieldAlert className="mx-auto h-10 w-10 text-rose-400" />
            <h1 className="mt-4 text-2xl font-semibold text-white">Admin Access Required</h1>
            <p className="mt-2 text-sm text-slate-400">Connect the admin wallet to access this page.</p>
            <button
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
              onClick={() => void connect()}
            >
              Connect wallet
            </button>
          </div>
        </main>
      </div>
    );
  }

  // Wrong wallet
  if (!isAdmin) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="mx-auto max-w-4xl px-4 py-24 text-center sm:px-6">
          <div className="surface-panel px-6 py-12">
            <ShieldAlert className="mx-auto h-10 w-10 text-rose-400" />
            <h1 className="mt-4 text-2xl font-semibold text-white">Access Denied</h1>
            <p className="mt-2 text-sm text-slate-400">
              This page is only accessible to the contract admin.
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Connected: <StarknetAddress address={wallet.address} className="text-slate-400" />
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6">
        <Link className="inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white" href="/">
          <ArrowLeft className="h-4 w-4" />
          Back to feed
        </Link>

        <section className="mt-6 surface-panel px-6 py-6">
          <div className="flex items-center gap-3">
            <Shield className="h-6 w-6 text-cyan-300" />
            <div>
              <h1 className="text-xl font-semibold text-white">Admin Panel</h1>
              <p className="text-sm text-slate-400">Manage dare listings on the board</p>
            </div>
          </div>
        </section>

        {/* Filters */}
        <section className="mt-4 flex flex-wrap items-center gap-2">
          {(["all", "listed", "delisted"] as const).map((f) => (
            <button
              key={f}
              className={
                filter === f
                  ? "rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950"
                  : "rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-400 transition hover:text-white"
              }
              onClick={() => setFilter(f)}
            >
              {f === "all" ? `All (${dares.filter((d) => !d.legacy).length})` : f === "delisted" ? `Delisted (${dares.filter((d) => !d.legacy && delistedMap[d.id.toString()]).length})` : `Listed (${dares.filter((d) => !d.legacy && !delistedMap[d.id.toString()]).length})`}
            </button>
          ))}
        </section>

        <section className="mt-6">
          {loading ? (
            <div className="surface-panel flex min-h-64 items-center justify-center px-6 py-12">
              <LoadingSpinner size="lg" text="Loading dares..." />
            </div>
          ) : filteredDares.length === 0 ? (
            <div className="surface-panel px-6 py-12 text-center">
              <p className="text-lg font-semibold text-white">No dares found</p>
              <p className="mt-2 text-sm text-slate-400">
                {filter === "delisted" ? "No dares have been delisted." : "No dares on the current contract."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredDares.map((dare) => {
                const key = dare.id.toString();
                const delisted = delistedMap[key] ?? false;
                const isLoading = actionLoading === key;

                return (
                  <div
                    key={key}
                    className={`flex items-center gap-4 rounded-2xl border px-4 py-3 transition ${
                      delisted
                        ? "border-rose-300/20 bg-rose-300/5"
                        : "border-white/10 bg-white/[0.03]"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-slate-500">#{key}</span>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          dare.status === "Open" ? "bg-emerald-500/20 text-emerald-300" :
                          dare.status === "Claimed" ? "bg-amber-500/20 text-amber-300" :
                          dare.status === "Voting" ? "bg-blue-500/20 text-blue-300" :
                          dare.status === "Approved" ? "bg-green-500/20 text-green-300" :
                          dare.status === "Rejected" ? "bg-rose-500/20 text-rose-300" :
                          "bg-slate-500/20 text-slate-400"
                        }`}>
                          {dare.status}
                        </span>
                        {delisted && (
                          <span className="rounded-full bg-rose-500/20 px-2 py-0.5 text-xs font-medium text-rose-300">
                            Delisted
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm font-medium text-white truncate">{dare.title}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {formatAmount(dare.rewardAmount, getTokenDecimals(dare.rewardToken))} {getTokenSymbol(dare.rewardToken)}
                        {" · "}
                        Poster: <StarknetAddress address={dare.poster} className="text-slate-500" />
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <a
                        href={`/dare/${key}`}
                        className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-400 transition hover:text-white hover:bg-white/10"
                      >
                        View
                      </a>
                      {delisted ? (
                        <button
                          className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300/20 bg-emerald-300/10 px-3 py-1.5 text-xs font-medium text-emerald-300 transition hover:bg-emerald-300/20 disabled:opacity-50"
                          disabled={isLoading}
                          onClick={() => void handleRelist(dare)}
                        >
                          {isLoading ? <LoadingSpinner size="sm" /> : <Eye className="h-3.5 w-3.5" />}
                          Relist
                        </button>
                      ) : (
                        <button
                          className="inline-flex items-center gap-1.5 rounded-lg border border-rose-300/20 bg-rose-300/10 px-3 py-1.5 text-xs font-medium text-rose-300 transition hover:bg-rose-300/20 disabled:opacity-50"
                          disabled={isLoading}
                          onClick={() => void handleDelist(dare)}
                        >
                          {isLoading ? <LoadingSpinner size="sm" /> : <EyeOff className="h-3.5 w-3.5" />}
                          Delist
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
