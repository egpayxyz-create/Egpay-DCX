"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// ⛔ localhost fix
// 🔥 अब backend URL automatic detect होगा
const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5001";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

type Market = {
  pair: string;
  symbol: string;
  lastPrice: number;
  totalTrades: number;
};

export default function MarketsPage() {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    async function loadMarkets() {
      try {
        const res = await fetch(`${API_BASE}/markets`, {
          cache: "no-store",
        });
        const data = await res.json();
        setMarkets(data);
      } catch (err) {
        console.error("Failed to load markets", err);
      } finally {
        setLoading(false);
      }
    }

    loadMarkets(); // first time load

    // Auto-refresh every 3 sec
    interval = setInterval(() => {
      loadMarkets();
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <main className="min-h-screen bg-black text-white p-8">
      <h1 className="text-3xl font-bold text-yellow-400 mb-6">
        EGPAYDCX Markets
      </h1>

      <p className="text-gray-300 mb-4">
        Select a trading pair to open the live trade screen.
      </p>

      {loading ? (
        <p className="text-gray-400">Loading markets...</p>
      ) : markets.length === 0 ? (
        <p className="text-gray-500">No markets available.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-gray-900 rounded-lg overflow-hidden">
            <thead>
              <tr className="bg-gray-800 text-left text-sm uppercase text-gray-400">
                <th className="px-4 py-3">Pair</th>
                <th className="px-4 py-3">Last Price</th>
                <th className="px-4 py-3">Trades</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {markets.map((m) => (
                <tr key={m.pair} className="border-t border-gray-700 text-sm">
                  <td className="px-4 py-3 font-semibold text-yellow-300">
                    {m.symbol}
                  </td>
                  <td className="px-4 py-3">
                    {Number(m.lastPrice).toFixed(6)}
                  </td>
                  <td className="px-4 py-3">{m.totalTrades}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/trade/${encodeURIComponent(m.pair)}`}
                      className="inline-block px-4 py-2 rounded bg-green-500 text-black font-bold hover:bg-green-400 text-xs"
                    >
                      Trade
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}