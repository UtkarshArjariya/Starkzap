"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AlertTriangle, Menu, Moon, Sun, Trophy, X, Zap, LogOut, UserRound, ToggleRight } from "lucide-react";
import { useState } from "react";
import { shortAddress } from "@/lib/config";
import { cn } from "@/lib/utils";
import { useTheme } from "@/context/ThemeContext";
import { useUI } from "@/context/UIContext";
import { useWallet } from "@/context/WalletContext";

const NAV_ITEMS = [
  { href: "/", label: "Feed" },
  { href: "/create", label: "Post Dare" },
  { href: "/leaderboard", label: "Leaderboard" },
];

export default function Header() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const { theme, toggle: toggleTheme } = useTheme();
  const { toggle: toggleUI } = useUI();
  const { wallet, wrongNetwork, expectedNetwork, connect, disconnect } = useWallet();

  return (
    <header className="sticky top-0 z-40">
      {wrongNetwork ? (
        <div className="flex items-center justify-center gap-2 bg-amber-500/90 px-4 py-2 text-xs font-medium text-slate-950">
          <AlertTriangle className="h-3.5 w-3.5" />
          Your wallet is on the wrong network. Please switch to{" "}
          <span className="font-bold">{expectedNetwork}</span> in your wallet extension.
        </div>
      ) : null}
      <div className="border-b border-white/10 bg-slate-950/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link className="flex items-center gap-3 text-white" href="/">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-400/25 via-violet-400/15 to-cyan-300/20 ring-1 ring-white/10">
            <Zap className="h-5 w-5 fill-cyan-200 text-cyan-200" />
          </span>
          <span>
            <span className="block text-[11px] uppercase tracking-[0.22em] text-cyan-200/80">Starknet Sepolia</span>
            <span className="text-lg font-semibold tracking-tight">Dare Board</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-2 md:flex">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              className={cn(
                "rounded-full px-4 py-2 text-sm transition",
                pathname === item.href
                  ? "bg-white/10 text-white"
                  : "text-slate-400 hover:bg-white/5 hover:text-white",
              )}
              href={item.href}
            >
              {item.label}
            </Link>
          ))}
          {wallet ? (
            <Link
              className={cn(
                "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm transition",
                pathname === "/profile"
                  ? "bg-white/10 text-white"
                  : "text-slate-400 hover:bg-white/5 hover:text-white",
              )}
              href="/profile"
            >
              <UserRound className="h-4 w-4" />
              Profile
            </Link>
          ) : null}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <button
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 text-xs font-medium text-slate-300 transition hover:border-cyan-300/30 hover:text-white"
            onClick={toggleUI}
            title="Switch to modern UI"
          >
            <ToggleRight className="h-4 w-4" />
            Modern
          </button>
          <button
            aria-label="Toggle theme"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-300 transition hover:border-cyan-300/30 hover:text-white"
            onClick={toggleTheme}
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          {wallet ? (
            <>
              <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 font-mono text-xs text-slate-200">
                {shortAddress(wallet.address)}
              </span>
              <button
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300 transition hover:border-rose-300/30 hover:text-white"
                onClick={() => void disconnect()}
              >
                <LogOut className="h-4 w-4" />
                Disconnect
              </button>
            </>
          ) : (
            <button
              className="inline-flex items-center gap-2 rounded-full bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
              onClick={() => void connect()}
            >
              <Zap className="h-4 w-4" />
              Connect
            </button>
          )}
        </div>

        <button
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-300 transition hover:text-white md:hidden"
          onClick={() => setMenuOpen((current) => !current)}
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {menuOpen ? (
        <div className="border-t border-white/10 bg-slate-950/95 px-4 py-4 md:hidden">
          <div className="mx-auto flex max-w-6xl flex-col gap-2">
            {[...NAV_ITEMS, ...(wallet ? [{ href: "/profile", label: "Profile" }] : [])].map((item) => (
              <Link
                key={item.href}
                className={cn(
                  "rounded-2xl px-4 py-3 text-sm transition",
                  pathname === item.href
                    ? "bg-white/10 text-white"
                    : "text-slate-400 hover:bg-white/5 hover:text-white",
                )}
                href={item.href}
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}

            {wallet ? (
              <div className="mt-2 flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <span className="font-mono text-xs text-slate-200">{shortAddress(wallet.address)}</span>
                <button className="text-sm text-rose-200" onClick={() => void disconnect()}>
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                className="mt-2 rounded-2xl bg-cyan-300 px-4 py-3 text-sm font-semibold text-slate-950"
                onClick={() => void connect()}
              >
                Connect wallet
              </button>
            )}

            <button
              className="mt-2 flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300 transition hover:text-white"
              onClick={toggleUI}
            >
              <ToggleRight className="h-4 w-4" />
              Switch to Modern UI
            </button>

            <button
              aria-label="Toggle theme"
              className="mt-2 flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300 transition hover:text-white"
              onClick={toggleTheme}
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              {theme === "dark" ? "Light mode" : "Dark mode"}
            </button>
          </div>
        </div>
      ) : null}
      </div>
    </header>
  );
}
