"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import Toasts from "@/components/Toast";
import { ThemeProvider } from "@/context/ThemeContext";
import { ToastProvider } from "@/context/ToastContext";
import { UIProvider } from "@/context/UIContext";
import { WalletProvider } from "@/context/WalletContext";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
      config={{
        appearance: { theme: "dark" },
      }}
    >
      <ThemeProvider>
        <ToastProvider>
          <UIProvider>
            <WalletProvider>
              {children}
              <Toasts />
            </WalletProvider>
          </UIProvider>
        </ToastProvider>
      </ThemeProvider>
    </PrivyProvider>
  );
}
