import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { getConnectedWallet, disconnectWallet } from "@/lib/starkzap";
import WalletModal from "@/components/WalletModal";

const WalletContext = createContext(null);

export function WalletProvider({ children }) {
  const [wallet, setWallet]       = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [error, setError]         = useState("");

  // Try to restore last session silently
  useEffect(() => {
    getConnectedWallet().then((w) => {
      if (w) setWallet(w);
    });
  }, []);

  /** Opens the wallet picker modal. Returns a Promise that resolves with the wallet. */
  const connect = useCallback(() => {
    return new Promise((resolve, reject) => {
      setError("");
      // Store callbacks so WalletModal can resolve/reject
      window.__walletConnectResolve = resolve;
      window.__walletConnectReject  = reject;
      setShowModal(true);
    });
  }, []);

  const handleModalConnect = useCallback((w) => {
    setWallet(w);
    setShowModal(false);
    window.__walletConnectResolve?.(w);
    window.__walletConnectResolve = null;
    window.__walletConnectReject  = null;
  }, []);

  const handleModalClose = useCallback(() => {
    setShowModal(false);
    const err = new Error("Wallet connection cancelled");
    window.__walletConnectReject?.(err);
    window.__walletConnectResolve = null;
    window.__walletConnectReject  = null;
  }, []);

  const disconnect = useCallback(async () => {
    await disconnectWallet();
    setWallet(null);
  }, []);

  return (
    <WalletContext.Provider value={{ wallet, connect, disconnect, error }}>
      {children}
      {showModal && (
        <WalletModal
          onConnect={handleModalConnect}
          onClose={handleModalClose}
        />
      )}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  return useContext(WalletContext);
}
