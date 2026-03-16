"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import WalletModal from "@/components/WalletModal";
import { disconnectWallet, getConnectedWallet } from "@/lib/starkzap";
import type { WalletAccount } from "@/lib/types";

type WalletContextValue = {
  wallet: WalletAccount | null;
  connect: () => Promise<WalletAccount>;
  disconnect: () => Promise<void>;
};

const WalletContext = createContext<WalletContextValue | null>(null);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [wallet, setWallet] = useState<WalletAccount | null>(null);
  const [showModal, setShowModal] = useState(false);
  const pendingConnectRef = useRef<{
    resolve: (wallet: WalletAccount) => void;
    reject: (error: Error) => void;
  } | null>(null);

  useEffect(() => {
    void getConnectedWallet().then((connectedWallet) => {
      if (connectedWallet) {
        setWallet(connectedWallet);
      }
    });
  }, []);

  const connect = useCallback(() => {
    setShowModal(true);

    return new Promise<WalletAccount>((resolve, reject) => {
      pendingConnectRef.current = { resolve, reject };
    });
  }, []);

  const disconnect = useCallback(async () => {
    await disconnectWallet();
    setWallet(null);
  }, []);

  const handleConnect = useCallback((connectedWallet: WalletAccount) => {
    setWallet(connectedWallet);
    setShowModal(false);
    pendingConnectRef.current?.resolve(connectedWallet);
    pendingConnectRef.current = null;
  }, []);

  const handleClose = useCallback(() => {
    setShowModal(false);
    pendingConnectRef.current?.reject(new Error("Wallet connection cancelled"));
    pendingConnectRef.current = null;
  }, []);

  const value = useMemo<WalletContextValue>(
    () => ({ wallet, connect, disconnect }),
    [wallet, connect, disconnect],
  );

  return (
    <WalletContext.Provider value={value}>
      {children}
      {showModal ? <WalletModal onClose={handleClose} onConnect={handleConnect} /> : null}
    </WalletContext.Provider>
  );
}

export function useWallet(): WalletContextValue {
  const context = useContext(WalletContext);

  if (!context) {
    throw new Error("useWallet must be used inside WalletProvider");
  }

  return context;
}
