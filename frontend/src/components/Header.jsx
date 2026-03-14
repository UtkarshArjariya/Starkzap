"use client";
import { Link } from "react-router-dom";
import { useState } from "react";
import { useWallet } from "@/context/WalletContext";
import { shortAddress } from "@/lib/config";
import { Zap, Menu, X, LogOut, User } from "lucide-react";

export default function Header() {
  const { wallet, connect, disconnect } = useWallet();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header
      data-testid="app-header"
      className="sticky top-0 z-40 border-b border-white/10 bg-[#0F0F0F]/80 backdrop-blur-md"
    >
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo */}
        <Link
          to="/"
          className="flex items-center gap-2 font-bold text-lg tracking-tight text-white hover:text-purple-400 transition-colors"
          data-testid="logo-link"
        >
          <Zap size={20} className="text-purple-400 fill-purple-400" />
          Dare Board
        </Link>

        {/* Desktop nav */}
        <nav className="hidden sm:flex items-center gap-4">
          <Link to="/" className="text-sm text-gray-400 hover:text-white transition-colors" data-testid="nav-feed">
            Feed
          </Link>
          <Link to="/create" className="text-sm text-gray-400 hover:text-white transition-colors" data-testid="nav-create">
            Post Dare
          </Link>
          {wallet && (
            <Link to="/profile" className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-1" data-testid="nav-profile">
              <User size={14} />
              Profile
            </Link>
          )}
          <WalletChip wallet={wallet} onConnect={connect} onDisconnect={disconnect} />
        </nav>

        {/* Mobile toggle */}
        <button className="sm:hidden text-gray-400 hover:text-white" onClick={() => setMenuOpen(!menuOpen)} data-testid="mobile-menu-toggle">
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {menuOpen && (
        <div className="sm:hidden border-t border-white/10 bg-[#0F0F0F]/95 px-4 py-4 space-y-3">
          <Link to="/"        className="block text-sm text-gray-300 hover:text-white" onClick={() => setMenuOpen(false)}>Feed</Link>
          <Link to="/create"  className="block text-sm text-gray-300 hover:text-white" onClick={() => setMenuOpen(false)}>Post Dare</Link>
          {wallet && <Link to="/profile" className="block text-sm text-gray-300 hover:text-white" onClick={() => setMenuOpen(false)}>Profile</Link>}
          <div className="pt-1">
            <WalletChip wallet={wallet} onConnect={connect} onDisconnect={disconnect} />
          </div>
        </div>
      )}
    </header>
  );
}

function WalletChip({ wallet, onConnect, onDisconnect }) {
  if (wallet) {
    return (
      <div className="flex items-center gap-2">
        <span
          className="text-xs text-gray-300 bg-white/10 px-3 py-1.5 rounded-lg border border-white/10 font-mono"
          data-testid="wallet-address"
        >
          {shortAddress(wallet.address)}
        </span>
        <button
          onClick={onDisconnect}
          title="Disconnect"
          className="text-gray-500 hover:text-red-400 transition-colors"
          data-testid="disconnect-btn"
        >
          <LogOut size={15} />
        </button>
      </div>
    );
  }
  return (
    <button
      onClick={onConnect}
      className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
      data-testid="connect-wallet-btn"
    >
      <Zap size={14} />
      Connect
    </button>
  );
}

