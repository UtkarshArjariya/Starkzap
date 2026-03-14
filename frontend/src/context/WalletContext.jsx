import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { connectWallet, disconnectWallet, getConnectedWallet } from "@/lib/starkzap";

const WalletContext = createContext(null);

export function WalletProvider({ children }) {
  const [wallet, setWallet] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState("");

  // Try to restore previously connected wallet on page load
  useEffect(() => {
    getConnectedWallet().then((w) => {
      if (w) setWallet(w);
    });
  }, []);

  const connect = useCallback(async () => {
    setConnecting(true);
    setError("");
    try {
      const w = await connectWallet();
      setWallet(w);
      return w;
    } catch (e) {
      setError(e.message || "Connection failed");
      throw e;
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    await disconnectWallet();
    setWallet(null);
  }, []);

  return (
    <WalletContext.Provider value={{ wallet, connecting, error, connect, disconnect }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  return useContext(WalletContext);
}
