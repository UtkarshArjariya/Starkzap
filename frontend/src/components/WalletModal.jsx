import { useState, useEffect } from "react";
import { getInstalledWallets, connectExtensionWallet, connectWithPrivateKey } from "@/lib/starkzap";
import { X, Wallet, KeyRound, ExternalLink, Eye, EyeOff, ChevronDown, ChevronUp } from "lucide-react";
import LoadingSpinner from "./LoadingSpinner";

// Known Starknet wallet metadata
const WALLET_META = {
  braavos: {
    name: "Braavos",
    icon: "https://braavos.app/favicon.ico",
    installUrl: "https://braavos.app/",
  },
  argentX: {
    name: "Argent X",
    icon: "https://www.argent.xyz/favicon.ico",
    installUrl: "https://www.argent.xyz/argent-x/",
  },
  argent: {
    name: "Argent X",
    icon: "https://www.argent.xyz/favicon.ico",
    installUrl: "https://www.argent.xyz/argent-x/",
  },
};

function getWalletMeta(wallet) {
  const id = wallet?.id?.toLowerCase() ?? "";
  if (id.includes("braavos")) return WALLET_META.braavos;
  if (id.includes("argent")) return WALLET_META.argentX;
  return { name: wallet?.name ?? "Starknet Wallet", icon: wallet?.icon ?? "", installUrl: null };
}

export default function WalletModal({ onConnect, onClose }) {
  const [installedWallets, setInstalledWallets] = useState([]);
  const [loading, setLoading]     = useState(false);
  const [loadingId, setLoadingId] = useState("");
  const [error, setError]         = useState("");
  const [showKeyForm, setShowKeyForm] = useState(false);
  const [keyAddress, setKeyAddress]   = useState("");
  const [privateKey, setPrivateKey]   = useState("");
  const [showKey, setShowKey]         = useState(false);
  const [scanning, setScanning]       = useState(true);

  useEffect(() => {
    getInstalledWallets()
      .then(setInstalledWallets)
      .finally(() => setScanning(false));
  }, []);

  // Connect via browser extension
  const handleExtension = async (wallet) => {
    setError("");
    setLoadingId(wallet.id);
    setLoading(true);
    try {
      const w = await connectExtensionWallet(wallet);
      onConnect(w);
    } catch (e) {
      setError(e.message || "Connection failed");
    } finally {
      setLoading(false);
      setLoadingId("");
    }
  };

  // Connect with private key
  const handlePrivateKey = async () => {
    setError("");
    if (!keyAddress.trim()) return setError("Address is required");
    if (!privateKey.trim()) return setError("Private key is required");
    setLoading(true);
    try {
      const w = await connectWithPrivateKey(keyAddress.trim(), privateKey.trim());
      onConnect(w);
    } catch (e) {
      setError(e.message || "Failed to create account");
    } finally {
      setLoading(false);
    }
  };

  const discoveryWallets = [WALLET_META.braavos, WALLET_META.argentX];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      data-testid="wallet-modal"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative bg-[#161616] border border-white/15 rounded-2xl w-full max-w-sm shadow-2xl shadow-black/60 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Wallet size={18} className="text-purple-400" />
            <h2 className="text-white font-semibold text-base">Connect Wallet</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white transition-colors"
            data-testid="wallet-modal-close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* ── Browser Extension Wallets ── */}
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">
              Browser Extension
            </p>
            <div className="space-y-2">
              {scanning ? (
                <div className="flex justify-center py-3">
                  <LoadingSpinner size="sm" text="Scanning for wallets..." />
                </div>
              ) : installedWallets.length > 0 ? (
                installedWallets.map((w) => {
                  const meta = getWalletMeta(w);
                  return (
                    <button
                      key={w.id}
                      onClick={() => handleExtension(w)}
                      disabled={loading}
                      data-testid={`connect-${w.id}-btn`}
                      className="w-full flex items-center gap-3 px-4 py-3 bg-white/5 hover:bg-purple-600/20 hover:border-purple-500/40 border border-white/10 rounded-xl transition-all duration-150 disabled:opacity-50"
                    >
                      {meta.icon ? (
                        <img
                          src={meta.icon}
                          alt={meta.name}
                          className="w-7 h-7 rounded-lg"
                          onError={(e) => { e.target.style.display = "none"; }}
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center">
                          <Wallet size={14} className="text-purple-400" />
                        </div>
                      )}
                      <span className="text-white text-sm font-medium flex-1 text-left">
                        {meta.name}
                      </span>
                      {loadingId === w.id ? (
                        <LoadingSpinner size="sm" />
                      ) : (
                        <span className="text-xs text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full">
                          Installed
                        </span>
                      )}
                    </button>
                  );
                })
              ) : (
                // Not installed — show discovery links
                <div className="space-y-2">
                  {discoveryWallets.map((meta) => (
                    <a
                      key={meta.name}
                      href={meta.installUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center gap-3 px-4 py-3 bg-white/3 border border-white/8 rounded-xl hover:bg-white/6 transition-colors group"
                    >
                      <img
                        src={meta.icon}
                        alt={meta.name}
                        className="w-7 h-7 rounded-lg opacity-60"
                        onError={(e) => { e.target.style.display = "none"; }}
                      />
                      <span className="text-gray-400 text-sm flex-1 text-left">
                        {meta.name}
                      </span>
                      <span className="text-xs text-gray-600 flex items-center gap-1 group-hover:text-purple-400">
                        Install <ExternalLink size={11} />
                      </span>
                    </a>
                  ))}
                  <p className="text-xs text-gray-600 text-center pt-1">
                    Install an extension, then refresh
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-xs text-gray-600">or</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* ── Direct / Dev Key ── */}
          <div>
            <button
              onClick={() => setShowKeyForm(!showKeyForm)}
              className="w-full flex items-center gap-3 px-4 py-3 bg-white/5 hover:bg-white/8 border border-white/10 rounded-xl transition-colors"
              data-testid="direct-key-toggle"
            >
              <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <KeyRound size={14} className="text-amber-400" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-white text-sm font-medium">Direct Key</p>
                <p className="text-gray-600 text-xs">Use your Starknet private key</p>
              </div>
              {showKeyForm ? (
                <ChevronUp size={15} className="text-gray-500" />
              ) : (
                <ChevronDown size={15} className="text-gray-500" />
              )}
            </button>

            {showKeyForm && (
              <div className="mt-3 space-y-3 px-1 animate-in slide-in-from-bottom-4">
                {/* Address */}
                <div>
                  <label className="block text-xs text-gray-500 mb-1 uppercase tracking-wider">
                    Wallet Address
                  </label>
                  <input
                    type="text"
                    placeholder="0x031e44..."
                    value={keyAddress}
                    onChange={(e) => setKeyAddress(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm placeholder-gray-700 focus:outline-none focus:border-purple-500/50 font-mono"
                    data-testid="key-address-input"
                  />
                </div>
                {/* Private key */}
                <div>
                  <label className="block text-xs text-gray-500 mb-1 uppercase tracking-wider">
                    Private Key
                  </label>
                  <div className="relative">
                    <input
                      type={showKey ? "text" : "password"}
                      placeholder="0x00e6d4..."
                      value={privateKey}
                      onChange={(e) => setPrivateKey(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 pr-10 text-white text-sm placeholder-gray-700 focus:outline-none focus:border-purple-500/50 font-mono"
                      data-testid="private-key-input"
                    />
                    <button
                      onClick={() => setShowKey(!showKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400"
                      tabIndex={-1}
                    >
                      {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  <p className="text-xs text-amber-500/70 mt-1">
                    Only for testnet — never stored or sent anywhere
                  </p>
                </div>

                <button
                  onClick={handlePrivateKey}
                  disabled={loading || !keyAddress || !privateKey}
                  className="w-full py-2.5 bg-amber-600/80 hover:bg-amber-600 disabled:opacity-40 text-white rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
                  data-testid="connect-direct-key-btn"
                >
                  {loading ? <LoadingSpinner size="sm" /> : <KeyRound size={14} />}
                  Connect with Key
                </button>
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <p className="text-red-400 text-sm text-center bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5" data-testid="wallet-modal-error">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
