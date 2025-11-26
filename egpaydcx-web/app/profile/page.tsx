"use client";

import { useEffect, useState } from "react";
import { useOnchainEglifeBalance } from "../../lib/eglife";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

type Balance = {
  usdt: number;
  btc: number;
  eglife: number;
  inr: number;
};

export default function ProfilePage() {
  const [email, setEmail] = useState<string | null>(null);
  const [balance, setBalance] = useState<Balance>({
    usdt: 0,
    btc: 0,
    eglife: 0,
    inr: 0,
  });
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [totalOrders, setTotalOrders] = useState(0);
  const [totalTrades, setTotalTrades] = useState(0);

  // Login + local info load
  useEffect(() => {
    if (typeof window === "undefined") return;

    const token = localStorage.getItem("token");
    if (!token) {
      window.location.href = "/login";
      return;
    }

    const storedEmail = localStorage.getItem("email");
    setEmail(storedEmail);

    const addr = localStorage.getItem("walletAddress");
    setWalletAddress(addr);

    async function loadData() {
      try {
        const [balRes, ordersRes, tradesRes] = await Promise.all([
          fetch("http://localhost:5001/balance", { cache: "no-store" }),
          fetch("http://localhost:5001/orders", { cache: "no-store" }),
          fetch("http://localhost:5001/trades", { cache: "no-store" }),
        ]);

        const balData = await balRes.json();
        setBalance({
          usdt: balData.usdt ?? 0,
          btc: balData.btc ?? 0,
          eglife: balData.eglife ?? 0,
          inr: balData.inr ?? 0,
        });

        const ordersData = await ordersRes.json();
        const tradesData = await tradesRes.json();

        let ordersCount = 0;
        let tradesCount = 0;

        if (ordersData && typeof ordersData === "object") {
          Object.values(ordersData as any).forEach((arr: any) => {
            if (Array.isArray(arr)) ordersCount += arr.length;
          });
        }

        if (tradesData && typeof tradesData === "object") {
          Object.values(tradesData as any).forEach((arr: any) => {
            if (Array.isArray(arr)) tradesCount += arr.length;
          });
        }

        setTotalOrders(ordersCount);
        setTotalTrades(tradesCount);
      } catch (err) {
        console.error("Failed to load profile data", err);
      }
    }

    loadData();
  }, []);

  // On-chain EGLIFE (BSC mainnet)
  const {
    formatted: onchainEglife,
    isLoading: onchainLoading,
  } = useOnchainEglifeBalance(walletAddress);

  return (
    <main className="min-h-screen bg-black text-white p-8">
      <h1 className="text-3xl font-bold text-yellow-400 mb-6">
        My Profile – EGPAYDCX
      </h1>

      {/* Top row: Account, Wallet, Trading Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Account Info */}
        <div className="bg-gray-900 border border-yellow-500 rounded p-6">
          <h2 className="text-xl font-bold mb-4">Account Info</h2>
          <p className="text-sm text-gray-300 mb-2">
            <span className="font-semibold text-gray-200">Email:</span>{" "}
            {email ?? "Not available"}
          </p>
          <p className="text-sm text-gray-300 mb-2">
            <span className="font-semibold text-gray-200">
              Logged In:
            </span>{" "}
            Yes (local token)
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Yeh account EGPAYDCX demo trading system ke liye hai
            (off-chain simulation + on-chain EGLIFE view).
          </p>
        </div>

        {/* Wallet Overview (demo + on-chain summary) */}
        <div className="bg-gray-900 border border-yellow-500 rounded p-6">
          <h2 className="text-xl font-bold mb-4">Wallet Overview</h2>

          <p className="text-sm mb-1">
            <span className="text-gray-300">USDT (Demo):</span>{" "}
            <span className="text-green-400 font-semibold">
              {balance.usdt.toFixed(2)}
            </span>
          </p>

          <p className="text-sm mb-1">
            <span className="text-gray-300">BTC (Demo):</span>{" "}
            <span className="text-green-400 font-semibold">
              {balance.btc.toFixed(4)}
            </span>
          </p>

          <p className="text-sm mb-1">
            <span className="text-gray-300">EGLIFE (Demo):</span>{" "}
            <span className="text-green-400 font-semibold">
              {balance.eglife.toFixed(2)}
            </span>
          </p>

          <p className="text-sm mb-1">
            <span className="text-gray-300">INR (Virtual):</span>{" "}
            <span className="text-green-400 font-semibold">
              {balance.inr.toFixed(2)}
            </span>
          </p>

          <hr className="my-3 border-gray-700" />

          <h3 className="text-sm font-semibold text-yellow-300 mb-1">
            On-chain EGLIFE (BSC Mainnet)
          </h3>
          {!walletAddress ? (
            <p className="text-xs text-red-400">
              Wallet not connected. Navbar me &quot;Connect Wallet&quot; click
              karke MetaMask se BSC wallet connect karein.
            </p>
          ) : onchainLoading ? (
            <p className="text-xs text-gray-400">
              Loading on-chain EGLIFE balance...
            </p>
          ) : (
            <p className="text-xs text-gray-200">
              Wallet{" "}
              <span className="font-mono text-yellow-300">
                {walletAddress}
              </span>{" "}
              holds{" "}
              <span className="text-green-400 font-semibold">
                {onchainEglife} EGLIFE
              </span>{" "}
              on BSC mainnet.
            </p>
          )}

          <p className="text-[10px] text-gray-500 mt-2">
            Demo balance sirf exchange simulation ke liye hai. On-chain
            EGLIFE aapke actual MetaMask / BSC wallet se read ho raha hai.
          </p>
        </div>

        {/* Trading Stats */}
        <div className="bg-gray-900 border border-yellow-500 rounded p-6">
          <h2 className="text-xl font-bold mb-4">Trading Stats</h2>

          <p className="text-sm mb-2">
            <span className="text-gray-300">Total Orders (All Pairs):</span>{" "}
            <span className="text-yellow-300 font-semibold">
              {totalOrders}
            </span>
          </p>

          <p className="text-sm mb-2">
            <span className="text-gray-300">Total Trades (All Pairs):</span>{" "}
            <span className="text-yellow-300 font-semibold">
              {totalTrades}
            </span>
          </p>

          <p className="text-xs text-gray-500 mt-3">
            Ye stats aapke saare pairs (BTC/USDT, EGLIFE/USDT, EGLIFE/INR)
            ke combined order & trade count ko show kar rahe hain.
          </p>
        </div>
      </div>

      {/* EGLIFE Highlight Strip */}
      <div className="mt-8 bg-gradient-to-r from-yellow-500 via-yellow-400 to-yellow-600 text-black rounded-lg p-4 text-sm font-semibold">
        EGLIFE Highlight: Aapke demo wallet me{" "}
        <span className="underline">
          {balance.eglife.toFixed(2)} EGLIFE (demo)
        </span>{" "}
        hai. Agar aapne MetaMask se wallet connect kiya hai to upar on-chain
        EGLIFE bhi दिख रहा hai. Future phase me isi se staking, cashback,
        aur swap features integrate honge.
      </div>
    </main>
  );
}