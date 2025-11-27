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

export default function WalletPage() {
  const [balance, setBalance] = useState<Balance>({
    usdt: 0,
    btc: 0,
    eglife: 0,
    inr: 0,
  });

  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const addr = localStorage.getItem("walletAddress");
    setWalletAddress(addr);

    async function loadBalance() {
      try {
        const res = await fetch("http://localhost:5001/balance", {
          cache: "no-store",
        });
        const data = await res.json();
        setBalance({
          usdt: data.usdt ?? 0,
          btc: data.btc ?? 0,
          eglife: data.eglife ?? 0,
          inr: data.inr ?? 0,
        });
      } catch (err) {
        console.error("Failed to load wallet balance", err);
      }
    }

    loadBalance();
  }, []);

  const {
    enabled: onchainEnabled,
    isLoading: onchainLoading,
    formatted: onchainEglife,
  } = useOnchainEglifeBalance(walletAddress);

  return (
    <main className="min-h-screen bg-black text-white p-8">
      <h1 className="text-3xl font-bold text-yellow-400 mb-6">
        Wallet – EGPAYDCX
      </h1>

      {walletAddress ? (
        <p className="text-xs text-gray-400 mb-3">
          Connected wallet:{" "}
          <span className="text-yellow-300 font-mono">{walletAddress}</span>
        </p>
      ) : (
        <p className="text-xs text-red-400 mb-3">
          No wallet connected. Please click "Connect Wallet" in the navbar to
          see on-chain EGLIFE balance.
        </p>
      )}

      <div className="overflow-x-auto mb-4">
        <table className="min-w-full bg-gray-900 rounded-lg overflow-hidden">
          <thead>
            <tr className="bg-gray-800 text-left text-sm uppercase text-gray-400">
              <th className="px-4 py-3">Asset</th>
              <th className="px-4 py-3">Available (Demo)</th>
              <th className="px-4 py-3">In Orders</th>
              <th className="px-4 py-3">Total (Demo)</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-gray-700 text-sm">
              <td className="px-4 py-3 font-semibold text-yellow-300">
                USDT
              </td>
              <td className="px-4 py-3 text-green-400">
                {balance.usdt.toFixed(2)}
              </td>
              <td className="px-4 py-3 text-gray-400">0.00</td>
              <td className="px-4 py-3 text-green-300">
                {balance.usdt.toFixed(2)}
              </td>
            </tr>

            <tr className="border-t border-gray-700 text-sm">
              <td className="px-4 py-3 font-semibold text-yellow-300">
                BTC
              </td>
              <td className="px-4 py-3 text-green-400">
                {balance.btc.toFixed(4)}
              </td>
              <td className="px-4 py-3 text-gray-400">0.0000</td>
              <td className="px-4 py-3 text-green-300">
                {balance.btc.toFixed(4)}
              </td>
            </tr>

            <tr className="border-t border-gray-700 text-sm">
              <td className="px-4 py-3 font-semibold text-yellow-300">
                EGLIFE (Demo)
              </td>
              <td className="px-4 py-3 text-green-400">
                {balance.eglife.toFixed(2)}
              </td>
              <td className="px-4 py-3 text-gray-400">0.00</td>
              <td className="px-4 py-3 text-green-300">
                {balance.eglife.toFixed(2)}
              </td>
            </tr>

            <tr className="border-t border-gray-700 text-sm">
              <td className="px-4 py-3 font-semibold text-yellow-300">
                INR (Virtual)
              </td>
              <td className="px-4 py-3 text-green-400">
                {balance.inr.toFixed(2)}
              </td>
              <td className="px-4 py-3 text-gray-400">0.00</td>
              <td className="px-4 py-3 text-green-300">
                {balance.inr.toFixed(2)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="bg-gray-900 border border-yellow-500 rounded p-4 text-sm">
        <h2 className="text-lg font-bold text-yellow-300 mb-2">
          On-chain EGLIFE Balance (BSC Mainnet)
        </h2>
        {!walletAddress ? (
          <p className="text-gray-400">
            Connect your BSC wallet from the navbar to see real EGLIFE
            balance.
          </p>
        ) : onchainLoading ? (
          <p className="text-gray-400">Loading on-chain balance...</p>
        ) : (
          <p className="text-gray-200">
            Wallet <span className="font-mono">{walletAddress}</span> holds{" "}
            <span className="text-green-400 font-semibold">
              {onchainEglife} EGLIFE
            </span>{" "}
            on BSC mainnet.
          </p>
        )}

        <p className="text-xs text-gray-500 mt-2">
          Note: This reads directly from the EGLIFE smart contract on Binance
          Smart Chain using Wagmi + Viem. Demo balance above is only for
          off-chain simulation.
        </p>
      </div>
    </main>
  );
}