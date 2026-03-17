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
import { usePrivy } from "@privy-io/react-auth";
import WalletModal from "@/components/WalletModal";
import { EXPECTED_CHAIN_ID, STARKNET_NETWORK } from "@/lib/config";
import { disconnectWallet, disconnectCartridgeWallet, disconnectPrivyWallet, getConnectedWallet } from "@/lib/starkzap";
import type { WalletAccount } from "@/lib/types";

type WalletType = "extension" | "cartridge" | "privy";

type WalletContextValue = {
  wallet: WalletAccount | null;
  wrongNetwork: boolean;
  expectedNetwork: string;
  connect: () => Promise<WalletAccount>;
  disconnect: () => Promise<void>;
};

const WalletContext = createContext<WalletContextValue | null>(null);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const { logout: privyLogout } = usePrivy();
  const [wallet, setWallet] = useState<WalletAccount | null>(null);
  const [showModal, setShowModal] = useState(false);
  // Track wallet type so we disconnect the right one
  const walletTypeRef = useRef<WalletType>("extension");
  const pendingConnectRef = useRef<{
    resolve: (wallet: WalletAccount) => void;
    reject: (error: Error) => void;
  } | null>(null);

  useEffect(() => {
    void getConnectedWallet().then((connectedWallet) => {
      if (connectedWallet) {
        setWallet(connectedWallet);
        walletTypeRef.current = "extension";
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
    switch (walletTypeRef.current) {
      case "cartridge":
        await disconnectCartridgeWallet();
        break;
      case "privy":
        await disconnectPrivyWallet();
        await privyLogout();
        break;
      default:
        await disconnectWallet();
    }
    walletTypeRef.current = "extension";
    setWallet(null);
  }, [privyLogout]);

  const handleConnect = useCallback((connectedWallet: WalletAccount, type: WalletType = "extension") => {
    walletTypeRef.current = type;
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

  const wrongNetwork = useMemo(() => {
    if (!wallet?.chainId) return false;
    return wallet.chainId !== EXPECTED_CHAIN_ID;
  }, [wallet?.chainId]);

  const value = useMemo<WalletContextValue>(
    () => ({ wallet, wrongNetwork, expectedNetwork: STARKNET_NETWORK, connect, disconnect }),
    [wallet, wrongNetwork, connect, disconnect],
  );

  return (
    <WalletContext.Provider value={value}>
      {children}
      {showModal ? (
        <WalletModal
          onClose={handleClose}
          onConnect={(w) => handleConnect(w, "extension")}
          onConnectCartridge={(w) => handleConnect(w, "cartridge")}
          onConnectPrivy={(w) => handleConnect(w, "privy")}
        />
      ) : null}
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
