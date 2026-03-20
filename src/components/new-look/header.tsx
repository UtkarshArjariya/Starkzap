"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Zap, Plus, Trophy, User, Menu, X, Bell, Moon, Sun,
  Copy, Check, LogOut, Settings, ExternalLink, Wallet,
  CheckCircle2, AlertCircle, TrendingUp, ToggleLeft,
  XCircle, Timer, Loader2,
} from "lucide-react";
import {
  shortAddress,
  addressesMatch,
  ZERO_ADDRESS,
  TOKENS,
  formatAmount,
  getTokenDecimals,
  VOYAGER_URL,
} from "@/lib/config";
import { getAllDares, getTokenBalance } from "@/lib/contract";
import { useTheme } from "@/context/ThemeContext";
import { useWallet } from "@/context/WalletContext";
import { useUI } from "@/context/UIContext";
import { SettingsModal } from "./settings-modal";
import type { Dare } from "@/lib/types";

const navLinks = [
  { href: "/", label: "Feed", icon: Zap },
  { href: "/create", label: "Create", icon: Plus },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/profile", label: "Profile", icon: User },
];

// ── Notification types ──────────────────────────────────────────────────────

interface Notification {
  id: string;
  type: "claim" | "vote" | "win" | "rejected" | "expired" | "open";
  title: string;
  description: string;
  dareId: string;
  read: boolean;
}

function deriveNotifications(dares: Dare[], userAddress: string): Notification[] {
  const notifs: Notification[] = [];

  for (const d of dares) {
    const isPoster = addressesMatch(d.poster, userAddress);
    const isClaimer =
      d.claimer &&
      d.claimer !== ZERO_ADDRESS &&
      addressesMatch(d.claimer, userAddress);

    // Poster: someone claimed your dare
    if (isPoster && d.status === "Claimed") {
      notifs.push({
        id: `claim-${d.id}`,
        type: "claim",
        title: "Your dare was claimed!",
        description: `"${d.title}" — someone accepted your challenge`,
        dareId: d.id.toString(),
        read: false,
      });
    }

    // Poster: voting is active, review proof
    if (isPoster && d.status === "Voting") {
      notifs.push({
        id: `vote-poster-${d.id}`,
        type: "vote",
        title: "Voting in progress",
        description: `"${d.title}" — proof submitted, voting is live`,
        dareId: d.id.toString(),
        read: false,
      });
    }

    // Claimer: voting is active on your claim
    if (isClaimer && d.status === "Voting") {
      notifs.push({
        id: `vote-claimer-${d.id}`,
        type: "vote",
        title: "Your proof is being voted on",
        description: `"${d.title}" — community is reviewing your proof`,
        dareId: d.id.toString(),
        read: false,
      });
    }

    // Claimer: you won
    if (isClaimer && d.status === "Approved") {
      notifs.push({
        id: `win-${d.id}`,
        type: "win",
        title: "You won a dare!",
        description: `"${d.title}" — reward sent to your wallet`,
        dareId: d.id.toString(),
        read: true,
      });
    }

    // Poster: dare was approved (claimer won)
    if (isPoster && d.status === "Approved") {
      notifs.push({
        id: `approved-poster-${d.id}`,
        type: "win",
        title: "Dare completed!",
        description: `"${d.title}" — the community approved the proof`,
        dareId: d.id.toString(),
        read: true,
      });
    }

    // Poster or claimer: rejected
    if ((isPoster || isClaimer) && d.status === "Rejected") {
      notifs.push({
        id: `rejected-${d.id}`,
        type: "rejected",
        title: "Dare rejected",
        description: `"${d.title}" — the community rejected the proof`,
        dareId: d.id.toString(),
        read: true,
      });
    }

    // Poster: dare expired with no claimer
    if (isPoster && d.status === "Expired") {
      notifs.push({
        id: `expired-${d.id}`,
        type: "expired",
        title: "Dare expired",
        description: `"${d.title}" — no one completed it in time`,
        dareId: d.id.toString(),
        read: true,
      });
    }

    // Poster: open dare nearing deadline (< 6 hours)
    if (isPoster && d.status === "Open") {
      const hoursLeft = (d.deadline - Date.now() / 1000) / 3600;
      if (hoursLeft > 0 && hoursLeft < 6) {
        notifs.push({
          id: `expiring-${d.id}`,
          type: "expired",
          title: "Dare expiring soon",
          description: `"${d.title}" — less than ${Math.ceil(hoursLeft)}h left`,
          dareId: d.id.toString(),
          read: false,
        });
      }
    }
  }

  // Unread first, then read
  return notifs.sort((a, b) => (a.read === b.read ? 0 : a.read ? 1 : -1));
}

const getNotificationIcon = (type: string) => {
  switch (type) {
    case "claim": return <CheckCircle2 className="h-4 w-4 text-primary" />;
    case "vote": return <AlertCircle className="h-4 w-4 text-[hsl(var(--warning))]" />;
    case "win": return <TrendingUp className="h-4 w-4 text-[hsl(var(--success))]" />;
    case "rejected": return <XCircle className="h-4 w-4 text-destructive" />;
    case "expired": return <Timer className="h-4 w-4 text-muted-foreground" />;
    default: return <Bell className="h-4 w-4 text-muted-foreground" />;
  }
};

// ── Balance tokens to fetch ─────────────────────────────────────────────────

const BALANCE_TOKENS = [
  { address: TOKENS.STRK, symbol: "STRK" },
  { address: TOKENS.ETH, symbol: "ETH" },
];

interface TokenBalance {
  symbol: string;
  formatted: string;
}

export function ModernHeader() {
  const pathname = usePathname();
  const { theme, toggle: toggleTheme } = useTheme();
  const { wallet, connect, disconnect } = useWallet();
  const { toggle: toggleUI } = useUI();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [walletOpen, setWalletOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Real notifications from on-chain dares
  const [dares, setDares] = useState<Dare[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);

  // Wallet balances
  const [balances, setBalances] = useState<TokenBalance[]>([]);
  const [balancesLoading, setBalancesLoading] = useState(false);

  const notificationRef = useRef<HTMLDivElement>(null);
  const walletRef = useRef<HTMLDivElement>(null);

  // Fetch dares for notifications
  const loadNotifications = useCallback(async () => {
    if (!wallet) return;
    setNotificationsLoading(true);
    try {
      const allDares = await getAllDares();
      setDares(allDares);
    } catch {
      // silent — notifications are best-effort
    } finally {
      setNotificationsLoading(false);
    }
  }, [wallet]);

  // Fetch wallet balances
  const loadBalances = useCallback(async () => {
    if (!wallet) return;
    setBalancesLoading(true);
    try {
      const results = await Promise.all(
        BALANCE_TOKENS.map(async (t) => {
          try {
            const raw = await getTokenBalance(t.address, wallet.address);
            const decimals = getTokenDecimals(t.address);
            return { symbol: t.symbol, formatted: formatAmount(raw, decimals) };
          } catch {
            return { symbol: t.symbol, formatted: "—" };
          }
        }),
      );
      setBalances(results);
    } catch {
      // silent
    } finally {
      setBalancesLoading(false);
    }
  }, [wallet]);

  // Load on wallet connect, refresh every 30s
  useEffect(() => {
    if (!wallet) {
      setDares([]);
      setBalances([]);
      return;
    }
    void loadNotifications();
    void loadBalances();
    const interval = setInterval(() => {
      void loadNotifications();
      void loadBalances();
    }, 30_000);
    return () => clearInterval(interval);
  }, [wallet, loadNotifications, loadBalances]);

  // Refresh balances when wallet dropdown opens
  useEffect(() => {
    if (walletOpen && wallet) void loadBalances();
  }, [walletOpen, wallet, loadBalances]);

  const notifications = useMemo(
    () => (wallet ? deriveNotifications(dares, wallet.address) : []),
    [dares, wallet],
  );
  const unreadCount = notifications.filter((n) => !n.read).length;

  const copyAddress = () => {
    if (!wallet) return;
    void navigator.clipboard.writeText(wallet.address).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
      if (walletRef.current && !walletRef.current.contains(event.target as Node)) {
        setWalletOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
              <Zap className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-semibold tracking-tight text-foreground">Dare Board</span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative px-4 py-2 text-sm font-medium transition-colors ${
                    isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {link.label}
                  {isActive && (
                    <span className="absolute bottom-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-primary" />
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-3">
            {/* UI Toggle */}
            <button
              onClick={toggleUI}
              className="hidden h-9 items-center gap-1.5 rounded-xl border border-border bg-secondary px-3 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground md:flex"
              title="Switch to classic UI"
            >
              <ToggleLeft className="h-4 w-4" />
              Classic
            </button>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="hidden h-9 w-9 items-center justify-center rounded-xl border border-border bg-secondary text-muted-foreground transition-colors hover:text-foreground md:flex"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            {/* Notifications */}
            <div ref={notificationRef} className="relative hidden md:block">
              <button
                onClick={() => { setNotificationsOpen(!notificationsOpen); setWalletOpen(false); }}
                className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-secondary text-muted-foreground transition-colors hover:text-foreground"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white">
                    {unreadCount}
                  </span>
                )}
              </button>
              {notificationsOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 overflow-hidden rounded-2xl border border-border bg-popover shadow-2xl">
                  <div className="flex items-center justify-between border-b border-border bg-muted/50 px-4 py-3">
                    <h3 className="font-semibold text-foreground">Notifications</h3>
                    {unreadCount > 0 && (
                      <span className="rounded-full bg-primary/20 px-2 py-0.5 text-xs font-medium text-primary">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notificationsLoading && notifications.length === 0 ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="px-4 py-8 text-center">
                        <Bell className="mx-auto mb-2 h-6 w-6 text-muted-foreground/50" />
                        <p className="text-sm text-muted-foreground">No notifications yet</p>
                        <p className="mt-1 text-xs text-muted-foreground/70">
                          Post or claim a dare to get started
                        </p>
                      </div>
                    ) : (
                      notifications.map((notification) => (
                        <Link
                          key={notification.id}
                          href={`/dare/${notification.dareId}`}
                          onClick={() => setNotificationsOpen(false)}
                          className={`flex gap-3 border-b border-border px-4 py-3 transition-colors hover:bg-muted/50 ${
                            !notification.read ? "bg-primary/5" : ""
                          }`}
                        >
                          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-muted">
                            {getNotificationIcon(notification.type)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-foreground">{notification.title}</p>
                            <p className="text-xs text-muted-foreground line-clamp-2">{notification.description}</p>
                          </div>
                          {!notification.read && (
                            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                          )}
                        </Link>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Wallet */}
            {wallet ? (
              <div ref={walletRef} className="relative hidden md:block">
                <button
                  onClick={() => { setWalletOpen(!walletOpen); setNotificationsOpen(false); }}
                  className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-all hover:opacity-90"
                >
                  <span className="h-2 w-2 animate-pulse rounded-full bg-success" />
                  <span className="font-mono">{shortAddress(wallet.address)}</span>
                </button>
                {walletOpen && (
                  <div className="absolute right-0 top-full mt-2 w-72 overflow-hidden rounded-2xl border border-border bg-popover shadow-2xl">
                    <div className="border-b border-border bg-muted/50 px-4 py-4">
                      <div className="mb-3 flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent">
                          <Wallet className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">Connected</p>
                          <div className="flex items-center gap-2">
                            <p className="font-mono text-xs text-muted-foreground">{shortAddress(wallet.address)}</p>
                            <button onClick={copyAddress} className="text-muted-foreground hover:text-foreground">
                              {copied ? <Check className="h-3 w-3 text-[hsl(var(--success))]" /> : <Copy className="h-3 w-3" />}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Wallet Balances */}
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        {balancesLoading && balances.length === 0 ? (
                          <>
                            <div className="animate-pulse rounded-xl bg-secondary p-3">
                              <div className="mb-1 h-3 w-10 rounded bg-muted" />
                              <div className="h-5 w-16 rounded bg-muted" />
                            </div>
                            <div className="animate-pulse rounded-xl bg-secondary p-3">
                              <div className="mb-1 h-3 w-10 rounded bg-muted" />
                              <div className="h-5 w-16 rounded bg-muted" />
                            </div>
                          </>
                        ) : (
                          balances.map((b) => (
                            <div key={b.symbol} className="rounded-xl bg-secondary p-3">
                              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                                {b.symbol}
                              </p>
                              <p className="text-sm font-bold text-foreground">{b.formatted}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                    <div className="py-2">
                      <Link href="/profile" className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground transition-colors hover:bg-muted/50" onClick={() => setWalletOpen(false)}>
                        <User className="h-4 w-4 text-muted-foreground" />
                        My Profile
                      </Link>
                      <button onClick={() => { setSettingsOpen(true); setWalletOpen(false); }} className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-foreground transition-colors hover:bg-muted/50">
                        <Settings className="h-4 w-4 text-muted-foreground" />
                        Settings
                      </button>
                      <a
                        href={`${VOYAGER_URL}/contract/${wallet.address}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground transition-colors hover:bg-muted/50"
                      >
                        <ExternalLink className="h-4 w-4 text-muted-foreground" />
                        View on Explorer
                      </a>
                    </div>
                    <div className="border-t border-border p-2">
                      <button onClick={() => void disconnect()} className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10">
                        <LogOut className="h-4 w-4" />
                        Disconnect Wallet
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => void connect()}
                className="hidden items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-all hover:opacity-90 md:flex"
              >
                <Zap className="h-4 w-4" />
                Connect
              </button>
            )}

            {/* Mobile Menu */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-secondary md:hidden"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 top-16 z-40 bg-background md:hidden">
          <nav className="flex flex-col p-4">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 rounded-2xl px-4 py-4 text-lg font-medium transition-colors ${
                    isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {link.label}
                </Link>
              );
            })}

            {wallet ? (
              <div className="mt-4 border-t border-border pt-4">
                <div className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent">
                      <Wallet className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Connected</p>
                      <p className="font-mono text-xs text-muted-foreground">{shortAddress(wallet.address)}</p>
                    </div>
                  </div>
                  {/* Mobile balances */}
                  {balances.length > 0 && (
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {balances.map((b) => (
                        <div key={b.symbol} className="rounded-xl bg-secondary p-3">
                          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                            {b.symbol}
                          </p>
                          <p className="text-sm font-bold text-foreground">{b.formatted}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <button onClick={() => void disconnect()} className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-destructive/30 px-4 py-3 text-sm font-medium text-destructive">
                  <LogOut className="h-4 w-4" />
                  Disconnect Wallet
                </button>
              </div>
            ) : (
              <button onClick={() => void connect()} className="mt-4 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground">
                Connect wallet
              </button>
            )}

            <button onClick={toggleUI} className="mt-3 flex items-center justify-center gap-2 rounded-2xl border border-border bg-secondary px-4 py-4 text-base font-medium text-muted-foreground">
              <ToggleLeft className="h-5 w-5" />
              Switch to Classic UI
            </button>

            <button onClick={toggleTheme} className="mt-3 flex items-center justify-center gap-2 rounded-2xl border border-border bg-secondary px-4 py-4 text-base font-medium text-muted-foreground">
              {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              {theme === "dark" ? "Light Mode" : "Dark Mode"}
            </button>
          </nav>
        </div>
      )}

      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}
