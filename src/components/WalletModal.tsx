"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Wallet, X } from "lucide-react";
import LoadingSpinner from "@/components/LoadingSpinner";
import { connectExtensionWallet, getInstalledWallets } from "@/lib/starkzap";
import type { InstalledWallet, WalletAccount } from "@/lib/types";

// ─── Types ────────────────────────────────────────────────────────────────────

type WalletModalProps = {
  onConnect: (wallet: WalletAccount) => void;
  onClose: () => void;
};

// ─── Supported wallet catalogue ───────────────────────────────────────────────

interface SupportedWallet {
  id: string;
  label: string;
  installUrl: string;
  /** accent used for the icon ring when no real icon is available */
  accent: string;
}

const SUPPORTED_WALLETS: SupportedWallet[] = [
  {
    id: "argentx",
    label: "Argent X",
    installUrl: "https://www.argent.xyz/argent-x/",
    accent: "from-fuchsia-400/30 to-violet-500/20",
  },
  {
    id: "braavos",
    label: "Braavos",
    installUrl: "https://braavos.app",
    accent: "from-cyan-400/30 to-sky-500/20",
  },
];

// ─── Helper: resolve a wallet's display icon ──────────────────────────────────

function resolveIcon(wallet: InstalledWallet): string | null {
  if (!wallet.icon) return null;
  if (typeof wallet.icon === "string") return wallet.icon;
  // icon can be { dark: string; light: string }
  return wallet.icon.dark || wallet.icon.light || null;
}

// ─── Helper: match an installed wallet to a supported entry ───────────────────

function findSupported(wallet: InstalledWallet): SupportedWallet | undefined {
  const id = (wallet.id ?? "").toLowerCase();
  return SUPPORTED_WALLETS.find((s) => id.includes(s.id));
}

// ─── WalletIcon sub-component ─────────────────────────────────────────────────

function WalletIcon({
  src,
  accent,
  label,
}: {
  src: string | null;
  accent: string;
  label: string;
}) {
  if (src) {
    return (
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br ${accent}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img alt={label} className="h-7 w-7 object-contain" src={src} />
      </div>
    );
  }

  return (
    <div
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${accent}`}
    >
      <Wallet className="h-5 w-5 text-white/80" />
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function WalletModal({ onConnect, onClose }: WalletModalProps) {
  const [installedWallets, setInstalledWallets] = useState<InstalledWallet[]>(
    [],
  );
  const [scanning, setScanning] = useState(true);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  // Scan for installed Starknet wallets on mount
  useEffect(() => {
    void getInstalledWallets()
      .then(setInstalledWallets)
      .finally(() => setScanning(false));
  }, []);

  // Look up an installed wallet by supported-wallet id key
  function getInstalled(supportedId: string): InstalledWallet | undefined {
    return installedWallets.find((w) =>
      (w.id ?? "").toLowerCase().includes(supportedId),
    );
  }

  async function handleConnect(wallet: InstalledWallet, supportedId: string) {
    setError("");
    setConnectingId(supportedId);

    try {
      const connected = await connectExtensionWallet(wallet);
      onConnect(connected);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to connect wallet.",
      );
    } finally {
      setConnectingId(null);
    }
  }

  const isConnecting = connectingId !== null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:px-4">
      {/* Backdrop */}
      <button
        aria-label="Close wallet modal"
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Card */}
      <div className="relative z-10 max-h-[90vh] w-full overflow-hidden overflow-y-auto rounded-t-[1.5rem] border border-white/10 bg-slate-950/95 shadow-2xl shadow-black/60 sm:max-w-md sm:rounded-[1.5rem]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-cyan-300/60">
              Wallet
            </p>
            <h2 className="mt-0.5 text-lg font-semibold text-white">
              Connect to Dare Board
            </h2>
          </div>
          <button
            aria-label="Close"
            className="rounded-full p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-3 p-5">
          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
            Browser Extension
          </p>

          {/* Scanning state */}
          {scanning ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-5">
              <LoadingSpinner size="sm" text="Scanning for Starknet wallets…" />
            </div>
          ) : (
            <div className="space-y-2">
              {SUPPORTED_WALLETS.map((supported) => {
                const installed = getInstalled(supported.id);
                const iconSrc = installed ? resolveIcon(installed) : null;
                const isLoading = connectingId === supported.id;

                if (installed) {
                  // ── Installed: show Connect button ────────────────────────
                  return (
                    <button
                      key={supported.id}
                      className="group flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left transition hover:border-cyan-300/30 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={isConnecting}
                      onClick={() =>
                        void handleConnect(installed, supported.id)
                      }
                    >
                      <WalletIcon
                        accent={supported.accent}
                        label={supported.label}
                        src={iconSrc}
                      />

                      <div className="flex-1 overflow-hidden">
                        <p className="truncate font-medium text-white">
                          {supported.label}
                        </p>
                        <p className="text-xs text-slate-400">
                          Installed and ready
                        </p>
                      </div>

                      {isLoading ? (
                        <LoadingSpinner size="sm" />
                      ) : (
                        <span className="shrink-0 rounded-full border border-emerald-300/25 bg-emerald-300/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-emerald-300 transition group-hover:bg-emerald-300/20">
                          Connect
                        </span>
                      )}
                    </button>
                  );
                }

                // ── Not installed: show Install link ──────────────────────
                return (
                  <a
                    key={supported.id}
                    className="flex w-full items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.03] px-4 py-3 transition hover:border-fuchsia-300/25 hover:bg-white/[0.06]"
                    href={supported.installUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <WalletIcon
                      accent={supported.accent}
                      label={supported.label}
                      src={null}
                    />

                    <div className="flex-1 overflow-hidden">
                      <p className="truncate font-medium text-white/70">
                        {supported.label}
                      </p>
                      <p className="text-xs text-slate-500">
                        Not installed — click to install
                      </p>
                    </div>

                    <ExternalLink className="h-4 w-4 shrink-0 text-slate-500" />
                  </a>
                );
              })}
            </div>
          )}

          {/* Error banner */}
          {error ? (
            <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm leading-relaxed text-rose-200">
              {error}
            </div>
          ) : null}

          {/* Footer hint */}
          {!scanning && !error && (
            <p className="text-center text-[11px] text-slate-600">
              Only Argent X and Braavos are supported on Starknet
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
