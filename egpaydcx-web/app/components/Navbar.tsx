"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

// TypeScript ke liye window.ethereum type
declare global {
  interface Window {
    ethereum?: any;
  }
}

export default function Navbar() {
  const [logged, setLogged] = useState(false);
  const [wallet, setWallet] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  // Short address helper: 0x1234...abcd
  const shortAddress = (addr: string) => {
    if (!addr) return "";
    return addr.slice(0, 6) + "..." + addr.slice(-4);
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      setLogged(!!localStorage.getItem("token"));
      const savedWallet = localStorage.getItem("walletAddress");
      if (savedWallet) setWallet(savedWallet);
    }
  }, []);

  const logout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
      // Wallet address ko generally remove nahi karte, par aap chahe to hata sakte hain
      // localStorage.removeItem("walletAddress");
      window.location.href = "/login";
    }
  };

  const connectWallet = async () => {
    if (typeof window === "undefined") return;

    if (!window.ethereum) {
      alert(
        "MetaMask ya koi Web3 wallet browser me installed nahi hai. Kripya MetaMask install karein."
      );
      return;
    }

    try {
      setConnecting(true);
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      if (accounts && accounts.length > 0) {
        const addr = accounts[0];
        setWallet(addr);
        localStorage.setItem("walletAddress", addr);
        alert(`Wallet connected: ${addr}`);
      } else {
        alert("Koi wallet address return nahi hua.");
      }
    } catch (err: any) {
      console.error("Wallet connect error:", err);
      alert("Wallet connect fail hua. Console check karein.");
    } finally {
      setConnecting(false);
    }
  };

  return (
    <nav className="bg-gray-900 border-b border-yellow-500 p-4 flex justify-between items-center">
      {/* Left: Logo */}
      <div>
        <Link href="/" className="text-yellow-300 text-2xl font-bold">
          EGPAYDCX
        </Link>
        <span className="text-xs text-gray-400 ml-2">
          by EGPAY Tech Private Limited
        </span>
      </div>

      {/* Right: Links + Wallet + Auth */}
      <div className="flex items-center gap-4 text-gray-300 text-sm">
        <Link href="/markets" className="hover:text-yellow-400">
          Markets
        </Link>
        <Link href="/trade/EGLIFE_USDT" className="hover:text-yellow-400">
          Trade EGLIFE
        </Link>
        <Link href="/wallet" className="hover:text-yellow-400">
          Wallet
        </Link>
        <Link href="/profile" className="hover:text-yellow-400">
          Profile
        </Link>

        {/* Wallet connect / address */}
        {wallet ? (
          <button
            onClick={connectWallet}
            className="px-3 py-1 rounded-full bg-gray-800 border border-green-500 text-green-300 text-xs hover:bg-gray-700"
            title={wallet}
          >
            🟢 {shortAddress(wallet)}
          </button>
        ) : (
          <button
            onClick={connectWallet}
            disabled={connecting}
            className="px-3 py-1 rounded-full bg-green-500 text-black font-semibold text-xs hover:bg-green-400 disabled:opacity-50"
          >
            {connecting ? "Connecting..." : "Connect Wallet"}
          </button>
        )}

        {/* Auth buttons */}
        {!logged ? (
          <>
            <Link href="/login" className="hover:text-yellow-400">
              Login
            </Link>
            <Link href="/signup" className="hover:text-yellow-400">
              Signup
            </Link>
          </>
        ) : (
          <button
            onClick={logout}
            className="text-red-400 hover:text-red-300 text-sm"
          >
            Logout
          </button>
        )}
      </div>
    </nav>
  );
}