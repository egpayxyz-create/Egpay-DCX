"use client";

import { useEffect, useState } from "react";
import { JsonRpcProvider, Contract, formatUnits } from "ethers";
import { USDT, EGLIFE } from "../../lib/swapConfig";

// BSC public RPC
const BSC_RPC = "https://bsc-dataseed.binance.org/";

// EGLIFE–USDT Pancake V2 pool (aapne jo diya tha)
const EGLIFE_USDT_POOL = "0xa75F11504a5F171A1B6d4bA8DBF39BF44010FAbc";

// Minimal PancakePair ABI
const PAIR_ABI = [
  "function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
];

type MarketInfo = {
  price: string;          // EGLIFE price in USDT
  liquidityUSDT: string;  // pool USDT liquidity (approx)
  lastUpdated: string;
};

export default function MarketsPage() {
  const [market, setMarket] = useState<MarketInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  async function loadMarket() {
    try {
      setLoading(true);
      setError("");

      const provider = new JsonRpcProvider(BSC_RPC);
      const pair = new Contract(EGLIFE_USDT_POOL, PAIR_ABI, provider);

      // getReserves: (reserve0, reserve1, timestamp)
      const [reserve0, reserve1] = (await pair.getReserves()) as [
        bigint,
        bigint,
        bigint?
      ];

      // ⚠️ Assumption: reserve0 = USDT, reserve1 = EGLIFE (aapke logs ke hisaab se)
      const usdtReserve = Number(formatUnits(reserve0, 18));
      const eglifeReserve = Number(formatUnits(reserve1, 18));

      if (eglifeReserve <= 0) {
        throw new Error("Invalid EGLIFE reserve from pool.");
      }

      const price = usdtReserve / eglifeReserve; // EGLIFE in USDT
      const liquidityUSDT = usdtReserve * 2; // rough total liquidity (USDT side * 2)

      const now = new Date();
      const lastUpdated = now.toLocaleString();

      setMarket({
        price: price.toFixed(6),
        liquidityUSDT: liquidityUSDT.toFixed(2),
        lastUpdated,
      });
    } catch (e: any) {
      console.error("loadMarket error", e);
      setError(
        e?.message ||
          "Unable to load on-chain price. Please check pool / network."
      );
      setMarket(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMarket();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-white px-4 py-8 flex justify-center">
      <div className="w-full max-w-3xl bg-slate-900/70 border border-slate-700 rounded-2xl p-5 shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl font-semibold">EGPAYEDX Markets</h1>
            <p className="text-xs text-slate-400 mt-1">
              Live on-chain price from PancakeSwap V2 — EGLIFE on BNB Smart
              Chain.
            </p>
          </div>
          <button
            onClick={loadMarket}
            disabled={loading}
            className="px-3 py-1 text-xs bg-slate-800 rounded-full border border-slate-600 disabled:opacity-50"
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {error && (
          <p className="text-xs text-red-400 mb-3 whitespace-pre-line">
            {error}
          </p>
        )}

        {/* Markets table (abhi 1 pair, future me aur add kar sakte ho) */}
        <div className="mt-2">
          <div className="overflow-x-auto rounded-xl border border-slate-700">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-800/80">
                <tr>
                  <th className="px-3 py-2 text-left">Pair</th>
                  <th className="px-3 py-2 text-right">Last Price (USDT)</th>
                  <th className="px-3 py-2 text-right">Pool Liquidity (USDT)</th>
                  <th className="px-3 py-2 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-slate-800">
                  <td className="px-3 py-3">
                    <div className="flex flex-col">
                      <span className="font-semibold">EGLIFE / USDT</span>
                      <span className="text-[11px] text-slate-400">
                        PancakeSwap V2 – BSC
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right">
                    {market ? market.price : loading ? "Loading..." : "-"}
                  </td>
                  <td className="px-3 py-3 text-right">
                    {market ? market.liquidityUSDT : loading ? "Loading..." : "-"}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <div className="flex flex-col gap-1 items-center">
                      <a
                        href="/swap"
                        className="px-3 py-1 rounded-full bg-emerald-600 hover:bg-emerald-500 text-[11px] font-semibold"
                      >
                        Trade on EGPAYEDX
                      </a>
                      <a
                        href="https://geckoterminal.com/bsc/pools/0xa75f11504a5f171a1b6d4ba8dbf39bf44010fabc"
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1 rounded-full bg-slate-800 border border-slate-600 text-[10px] text-slate-200 hover:bg-slate-700"
                      >
                        View on GeckoTerminal
                      </a>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {market && (
            <p className="mt-2 text-[10px] text-slate-500">
              Last updated: {market.lastUpdated}
            </p>
          )}
        </div>

        <p className="mt-4 text-[10px] text-slate-500">
          Price is calculated directly from PancakeSwap V2 EGLIFE/USDT pool
          reserves on BNB Smart Chain. Liquidity value is approximate (2× USDT
          side).
        </p>
      </div>
    </div>
  );
}