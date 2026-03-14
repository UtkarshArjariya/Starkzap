"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  KeyRound,
  Wallet,
  X,
} from "lucide-react";
import LoadingSpinner from "@/components/LoadingSpinner";
import {
  connectExtensionWallet,
  connectWithPrivateKey,
  getInstalledWallets,
} from "@/lib/starkzap";
import type { InstalledWallet, WalletAccount } from "@/lib/types";

type WalletModalProps = {
  onConnect: (wallet: WalletAccount) => void;
  onClose: () => void;
};

const FALLBACK_WALLETS = [
  { id: "braavos", name: "Braavos", installUrl: "https://braavos.app" },
  { id: "argentx", name: "Argent X", installUrl: "https://www.argent.xyz/argent-x/" },
];

function walletName(wallet: InstalledWallet): string {
  const id = wallet.id?.toLowerCase() || "";

  if (id.includes("braavos")) {
    return "Braavos";
  }

  if (id.includes("argent")) {
    return "Argent X";
  }

  return wallet.name || "Starknet Wallet";
}

function walletAccent(name: string): string {
  if (name.includes("Braavos")) {
    return "from-cyan-300/30 to-sky-400/20";
  }

  if (name.includes("Argent")) {
    return "from-fuchsia-300/25 to-violet-400/20";
  }

  return "from-white/10 to-white/5";
}

export default function WalletModal({ onConnect, onClose }: WalletModalProps) {
  const [installedWallets, setInstalledWallets] = useState<InstalledWallet[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingId, setLoadingId] = useState("");
  const [error, setError] = useState("");
  const [showKeyForm, setShowKeyForm] = useState(false);
  const [keyAddress, setKeyAddress] = useState("");
  const [privateKey, setPrivateKey] = useState("");
  const [scanning, setScanning] = useState(true);

  useEffect(() => {
    void getInstalledWallets()
      .then((wallets) => setInstalledWallets(wallets))
      .finally(() => setScanning(false));
  }, []);

  const discoveredWallets = useMemo(() => {
    if (installedWallets.length > 0) {
      return installedWallets;
    }

    return FALLBACK_WALLETS;
  }, [installedWallets]);

  const handleExtensionConnect = async (wallet: InstalledWallet) => {
    if (!wallet.id || !installedWallets.some((installed) => installed.id === wallet.id)) {
      return;
    }

    setError("");
    setLoading(true);
    setLoadingId(wallet.id);

    try {
      const connectedWallet = await connectExtensionWallet(wallet);
      onConnect(connectedWallet);
    } catch (connectError) {
      setError(connectError instanceof Error ? connectError.message : "Failed to connect wallet");
    } finally {
      setLoading(false);
      setLoadingId("");
    }
  };

  const handleDirectKey = async () => {
    setError("");

    if (!keyAddress.trim()) {
      setError("Wallet address is required");
      return;
    }

    if (!privateKey.trim()) {
      setError("Private key is required");
      return;
    }

    setLoading(true);

    try {
      const connectedWallet = await connectWithPrivateKey(keyAddress.trim(), privateKey.trim());
      onConnect(connectedWallet);
    } catch (connectError) {
      setError(connectError instanceof Error ? connectError.message : "Failed to connect with private key");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <button
        aria-label="Close wallet modal"
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-[1.5rem] border border-white/10 bg-slate-950/95 shadow-glow">
        <div className="border-b border-white/10 px-5 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-cyan-200/70">Wallet</p>
              <h2 className="mt-1 text-lg font-semibold text-white">Connect to Dare Board</h2>
            </div>
            <button className="text-slate-400 transition hover:text-white" onClick={onClose}>
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="space-y-5 p-5">
          <div>
            <p className="mb-2 text-xs uppercase tracking-[0.22em] text-slate-500">Browser extension</p>
            <div className="space-y-2">
              {scanning ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
                  <LoadingSpinner size="sm" text="Scanning for Starknet wallets..." />
                </div>
              ) : discoveredWallets.map((wallet) => {
                const name = walletName(wallet);
                const isInstalled = installedWallets.some((installed) => installed.id === wallet.id);

                return isInstalled ? (
                  <button
                    key={wallet.id}
                    className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left transition hover:border-cyan-300/30 hover:bg-white/10 disabled:opacity-60"
                    disabled={loading}
                    onClick={() => void handleExtensionConnect(wallet)}
                  >
                    <div className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${walletAccent(name)}`}>
                      <Wallet className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-white">{name}</p>
                      <p className="text-xs text-slate-400">Installed and ready</p>
                    </div>
                    {loadingId === wallet.id ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2 py-1 text-[11px] uppercase tracking-[0.2em] text-emerald-200">
                        Open
                      </span>
                    )}
                  </button>
                ) : (
                  <a
                    key={wallet.id}
                    className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 transition hover:border-fuchsia-300/30 hover:bg-white/10"
                    href={(wallet as { installUrl?: string }).installUrl || "https://www.starknet.io/"}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <div className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${walletAccent(name)}`}>
                      <Wallet className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-white">{name}</p>
                      <p className="text-xs text-slate-400">Install extension</p>
                    </div>
                    <ExternalLink className="h-4 w-4 text-slate-400" />
                  </a>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-[11px] uppercase tracking-[0.2em] text-slate-500">or</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          <div>
            <button
              className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left transition hover:bg-white/10"
              onClick={() => setShowKeyForm((current) => !current)}
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-300/20 to-rose-300/15">
                <KeyRound className="h-5 w-5 text-amber-100" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-white">Direct key</p>
                <p className="text-xs text-slate-400">Testnet-only fallback for local development</p>
              </div>
              {showKeyForm ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
            </button>

            {showKeyForm ? (
              <div className="mt-3 space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <label className="block text-xs uppercase tracking-[0.18em] text-slate-500">
                  Wallet address
                </label>
                <input
                  className="w-full rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2.5 font-mono text-sm text-white outline-none transition focus:border-cyan-300/40"
                  onChange={(event) => setKeyAddress(event.target.value)}
                  placeholder="0x..."
                  type="text"
                  value={keyAddress}
                />

                <label className="block text-xs uppercase tracking-[0.18em] text-slate-500">
                  Private key
                </label>
                <input
                  className="w-full rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2.5 font-mono text-sm text-white outline-none transition focus:border-cyan-300/40"
                  onChange={(event) => setPrivateKey(event.target.value)}
                  placeholder="0x..."
                  type="password"
                  value={privateKey}
                />

                <button
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-200 disabled:opacity-60"
                  disabled={loading || !keyAddress || !privateKey}
                  onClick={() => void handleDirectKey()}
                >
                  {loading ? <LoadingSpinner size="sm" /> : <KeyRound className="h-4 w-4" />}
                  Connect with key
                </button>
              </div>
            ) : null}
          </div>

          {error ? (
            <div className="rounded-2xl border border-rose-300/20 bg-rose-300/10 px-4 py-3 text-sm text-rose-100">
              {error}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
