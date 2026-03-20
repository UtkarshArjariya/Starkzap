"use client";

import { useState } from "react";
import { X, Bell, Shield, Eye, Globe } from "lucide-react";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [privateProfile, setPrivateProfile] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

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
                <Bell className="h-4 w-4 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground">Notifications</h3>
            </div>
            <div className="space-y-3 rounded-xl bg-muted/30 p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Enable Notifications</p>
                  <p className="text-xs text-muted-foreground">Get alerts for dares and updates</p>
                </div>
                <Toggle enabled={notificationsEnabled} onToggle={() => setNotificationsEnabled(!notificationsEnabled)} />
              </div>
              <div className="flex items-center justify-between border-t border-border pt-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Email Notifications</p>
                  <p className="text-xs text-muted-foreground">Receive updates via email</p>
                </div>
                <Toggle enabled={emailNotifs} onToggle={() => setEmailNotifs(!emailNotifs)} />
              </div>
              <div className="flex items-center justify-between border-t border-border pt-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Sound Effects</p>
                  <p className="text-xs text-muted-foreground">Play sounds for notifications</p>
                </div>
                <Toggle enabled={soundEnabled} onToggle={() => setSoundEnabled(!soundEnabled)} />
              </div>
            </div>
          </div>

          <div className="mb-6">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20">
                <Eye className="h-4 w-4 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground">Privacy</h3>
            </div>
            <div className="rounded-xl bg-muted/30 p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Private Profile</p>
                  <p className="text-xs text-muted-foreground">Hide profile from public leaderboards</p>
                </div>
                <Toggle enabled={privateProfile} onToggle={() => setPrivateProfile(!privateProfile)} />
              </div>
            </div>
          </div>

          <div className="mb-6">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20">
                <Shield className="h-4 w-4 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground">Security</h3>
            </div>
            <div className="rounded-xl bg-muted/30 p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Two-Factor Authentication</p>
                  <p className="text-xs text-muted-foreground">Add extra security to your account</p>
                </div>
                <Toggle enabled={twoFactorEnabled} onToggle={() => setTwoFactorEnabled(!twoFactorEnabled)} />
              </div>
            </div>
          </div>

          <div>
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20">
                <Globe className="h-4 w-4 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground">Language</h3>
            </div>
            <div className="rounded-xl bg-muted/30 p-3">
              <select className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground transition-colors hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/50">
                <option>English</option>
                <option>Spanish</option>
                <option>French</option>
                <option>German</option>
                <option>Japanese</option>
              </select>
            </div>
          </div>
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
