"use client";

import Link from "next/link";

import { useWallet } from "@/lib/starkzap";
import { shortenAddress } from "@/lib/utils";

export default function Header() {
  const { address, connect, disconnect, isConnecting } = useWallet();

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-ink/75 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" className="flex items-center gap-3">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-accent shadow-glow">
            <span className="text-lg font-black text-white">DB</span>
          </span>
          <span>
            <span className="block text-lg font-semibold text-white">Dare Board</span>
            <span className="block text-xs uppercase tracking-[0.22em] text-white/50">
              Starknet Sepolia
            </span>
          </span>
        </Link>

        <nav className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/create"
            className="rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-white/80 transition hover:border-accent/40 hover:text-white"
          >
            Post Dare
          </Link>
          <Link
            href="/profile"
            className="rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-white/80 transition hover:border-accent/40 hover:text-white"
          >
            Profile
          </Link>
          {address ? (
            <button
              type="button"
              onClick={() => void disconnect()}
              className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:bg-white/90"
            >
              {shortenAddress(address)}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void connect()}
              className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-dark disabled:opacity-60"
              disabled={isConnecting}
            >
              {isConnecting ? "Connecting..." : "Connect"}
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
