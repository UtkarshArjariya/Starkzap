"use client";

import Toasts from "@/components/Toast";
import { ThemeProvider } from "@/context/ThemeContext";
import { ToastProvider } from "@/context/ToastContext";
import { WalletProvider } from "@/context/WalletContext";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <ToastProvider>
        <WalletProvider>
          {children}
          <Toasts />
        </WalletProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
