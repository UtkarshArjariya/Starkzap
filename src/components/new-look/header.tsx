"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Zap, Plus, Trophy, User, Menu, X, Bell, Moon, Sun,
  Copy, Check, LogOut, Settings, ExternalLink, Wallet,
  Clock, CheckCircle2, AlertCircle, TrendingUp, ToggleLeft,
} from "lucide-react";
import { shortAddress } from "@/lib/config";
import { useTheme } from "@/context/ThemeContext";
import { useWallet } from "@/context/WalletContext";
import { useUI } from "@/context/UIContext";
import { SettingsModal } from "./settings-modal";

const navLinks = [
  { href: "/", label: "Feed", icon: Zap },
  { href: "/create", label: "Create", icon: Plus },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/profile", label: "Profile", icon: User },
];

const notifications = [
  { id: 1, type: "claim", title: "Your dare was claimed!", description: "Someone accepted your challenge", time: "2 mins ago", read: false },
  { id: 2, type: "vote", title: "Vote needed", description: "A proof submission is waiting for your vote", time: "15 mins ago", read: false },
  { id: 3, type: "win", title: "You won a dare!", description: "Congratulations! Reward sent to your wallet", time: "1 hour ago", read: true },
];

const getNotificationIcon = (type: string) => {
  switch (type) {
    case "claim": return <CheckCircle2 className="h-4 w-4 text-primary" />;
    case "vote": return <AlertCircle className="h-4 w-4 text-warning" />;
    case "win": return <TrendingUp className="h-4 w-4 text-success" />;
    default: return <Bell className="h-4 w-4 text-muted-foreground" />;
  }
};

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

  const notificationRef = useRef<HTMLDivElement>(null);
  const walletRef = useRef<HTMLDivElement>(null);
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
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`flex gap-3 border-b border-border px-4 py-3 transition-colors hover:bg-muted/50 ${
                          !notification.read ? "bg-primary/5" : ""
                        }`}
                      >
                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-muted">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">{notification.title}</p>
                          <p className="truncate text-xs text-muted-foreground">{notification.description}</p>
                          <p className="mt-1 text-[10px] text-muted-foreground/70">{notification.time}</p>
                        </div>
                      </div>
                    ))}
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
                              {copied ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
                            </button>
                          </div>
                        </div>
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
                        href={`https://sepolia.starkscan.co/contract/${wallet.address}`}
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
