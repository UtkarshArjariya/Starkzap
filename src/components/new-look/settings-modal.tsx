"use client";

import { X, Sun, Moon, Monitor, ExternalLink } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { useUI } from "@/context/UIContext";
import { useWallet } from "@/context/WalletContext";
import { VOYAGER_URL } from "@/lib/config";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { theme, toggle: toggleTheme } = useTheme();
  const { mode, toggle: toggleUI } = useUI();
  const { wallet } = useWallet();

  if (!isOpen) return null;

  const Toggle = ({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) => (
    <button
      onClick={onToggle}
      className={`relative h-6 w-11 rounded-full transition-colors ${
        enabled ? "bg-primary" : "bg-muted"
      }`}
    >
      <div
        className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${
          enabled ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-border bg-popover shadow-2xl">
        <div className="flex items-center justify-between border-b border-border bg-muted/50 px-6 py-4">
          <h2 className="text-xl font-semibold text-foreground">Settings</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto px-6 py-4">
          <div className="mb-6">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20">
                {theme === "dark" ? <Moon className="h-4 w-4 text-primary" /> : <Sun className="h-4 w-4 text-primary" />}
              </div>
              <h3 className="font-semibold text-foreground">Theme</h3>
            </div>
            <div className="rounded-xl bg-muted/30 p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Dark Mode</p>
                  <p className="text-xs text-muted-foreground">
                    Currently using {theme === "dark" ? "dark" : "light"} theme
                  </p>
                </div>
                <Toggle enabled={theme === "dark"} onToggle={toggleTheme} />
              </div>
            </div>
          </div>

          <div className="mb-6">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20">
                <Monitor className="h-4 w-4 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground">UI Mode</h3>
            </div>
            <div className="rounded-xl bg-muted/30 p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Modern UI</p>
                  <p className="text-xs text-muted-foreground">
                    Currently using {mode === "modern" ? "modern" : "classic"} interface
                  </p>
                </div>
                <Toggle enabled={mode === "modern"} onToggle={toggleUI} />
              </div>
            </div>
          </div>

          {wallet && (
            <div>
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20">
                  <ExternalLink className="h-4 w-4 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground">Wallet</h3>
              </div>
              <div className="rounded-xl bg-muted/30 p-3">
                <a
                  href={`${VOYAGER_URL}/contract/${wallet.address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between rounded-lg p-2 text-sm font-medium text-primary transition-colors hover:bg-muted"
                >
                  <span>View wallet on Voyager</span>
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-border bg-muted/30 px-6 py-4">
          <button onClick={onClose} className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90">
            Done
          </button>
        </div>
      </div>
    </>
  );
}
