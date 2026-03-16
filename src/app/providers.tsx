"use client";

import Toasts from "@/components/Toast";
import { ToastProvider } from "@/context/ToastContext";
import { WalletProvider } from "@/context/WalletContext";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <WalletProvider>
        {children}
        <Toasts />
      </WalletProvider>
    </ToastProvider>
  );
}
