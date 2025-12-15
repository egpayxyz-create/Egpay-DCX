"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Search,
  User,
  Wallet as WalletIcon,
  MessageCircle,
  Download,
  Globe,
  Moon,
} from "lucide-react";

declare global {
  interface Window {
    ethereum?: any;
  }
}

export default function Navbar() {
  const [logged, setLogged] = useState(false);
  const [wallet, setWallet] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  const shortAddress = (addr: string) =>
    addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : "";

  useEffect(() => {
    if (typeof window !== "undefined") {
      setLogged(!!localStorage.getItem("token"));
      const savedWallet = localStorage.getItem("walletAddress");
      if (savedWallet) setWallet(savedWallet);
    }
  }, []);

  const logout = () => {
    localStorage.removeItem("token");
    window.location.href = "/login";
  };

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("MetaMask ya koi Web3 wallet install nahi hai.");
      return;
    }
    try {
      setConnecting(true);
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      if (accounts?.length) {
        setWallet(accounts[0]);
        localStorage.setItem("walletAddress", accounts[0]);
      }
    } catch (e) {
      alert("Wallet connect failed");
    } finally {
      setConnecting(false);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-[#0b0f16]/90 backdrop-blur">
      {/* 🔥 ZERO PADDING NAV */}
      <nav className="w-full px-0 py-3 flex items-center gap-4">
        
        {/* LEFT: LOGO (EDGE TO EDGE) */}
        <div className="flex items-center pl-2">
          <Link
            href="/"
            className="text-xl font-extrabold tracking-wide
              bg-gradient-to-r from-yellow-300 via-yellow-400 to-amber-500
              bg-clip-text text-transparent
              drop-shadow-[0_1px_6px_rgba(234,179,8,0.35)]
              hover:opacity-90 transition"
          >
            Egpay<span className="font-black">DCX</span>
          </Link>
        </div>

        {/* MENU (LEFT SIDE, BINANCE STYLE) */}
        <div className="hidden lg:flex items-center gap-5 text-sm">
          <Link href="/buy" className="text-white/70 hover:text-white">Buy Crypto</Link>
          <Link href="/markets" className="text-white/70 hover:text-white">Markets</Link>
          <Link href="/trade/EGLIFE_USDT" className="text-white/70 hover:text-white">Trade</Link>
          <Link href="/futures" className="text-white/70 hover:text-white">Futures</Link>
          <Link href="/earn" className="text-white/70 hover:text-white">Earn</Link>
          <Link href="/square" className="text-white/70 hover:text-white">Square</Link>
          <Link href="/more" className="text-white/70 hover:text-white">More</Link>
        </div>

        {/* RIGHT: EVERYTHING PUSHED TO CORNER */}
        <div className="ml-auto flex items-center gap-2 pr-2">
          
          {/* Search */}
          <button className="p-2 hover:bg-white/5 rounded-md">
            <Search size={18} className="text-white/80" />
          </button>

          {/* Deposit */}
          <Link
            href="/deposit"
            className="hidden sm:inline-flex items-center gap-1 bg-yellow-400 px-4 py-2 text-sm font-semibold text-black hover:bg-yellow-300 transition"
          >
            Deposit
          </Link>

          {/* Wallet */}
          {wallet ? (
            <button
              onClick={connectWallet}
              title={wallet}
              className="px-3 py-1.5 rounded-full bg-white/5 border border-emerald-500/60 text-emerald-300 text-xs"
            >
              🟢 {shortAddress(wallet)}
            </button>
          ) : (
            <button
              onClick={connectWallet}
              disabled={connecting}
              className="px-3 py-1.5 rounded-full bg-emerald-400 text-black text-xs font-semibold hover:bg-emerald-300 disabled:opacity-50"
            >
              {connecting ? "Connecting..." : "Connect Wallet"}
            </button>
          )}

          {/* ICONS */}
          <div className="hidden sm:flex items-center gap-1">
            <User size={18} className="text-white/80 hover:text-yellow-400 cursor-pointer" />
            <WalletIcon size={18} className="text-white/80 hover:text-yellow-400 cursor-pointer" />
            <MessageCircle size={18} className="text-white/80 hover:text-yellow-400 cursor-pointer" />
            <Download size={18} className="text-white/80 hover:text-yellow-400 cursor-pointer" />
            <Globe size={18} className="text-white/80 hover:text-yellow-400 cursor-pointer" />
            <Moon size={18} className="text-white/80 hover:text-yellow-400 cursor-pointer" />
          </div>

          {/* LOGIN / LOGOUT */}
          {!logged ? (
            <div className="hidden sm:flex items-center gap-3 text-sm">
              <Link href="/login" className="text-white/70 hover:text-white">Login</Link>
              <Link href="/signup" className="text-white/70 hover:text-white">Signup</Link>
            </div>
          ) : (
            <button
              onClick={logout}
              className="hidden sm:inline-flex text-rose-300 hover:text-rose-200 text-sm"
            >
              Logout
            </button>
          )}
        </div>
      </nav>
    </header>
  );
}