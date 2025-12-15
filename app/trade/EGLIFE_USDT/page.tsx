"use client";

import { useEffect, useState } from "react";
import { JsonRpcProvider, Contract, formatUnits } from "ethers";

// EGLIFE–USDT pool aur BSC RPC
const BSC_RPC = "https://bsc-dataseed.binance.org/";
const EGLIFE_USDT_POOL = "0xa75F11504a5F171A1B6d4bA8DBF39BF44010FAbc";

// Minimal pair ABI
const PAIR_ABI = [
  "function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
];

type Ticker = {
  price: string;
  change24h: string;
  liquidityUSDT: string;
  lastUpdated: string;
};

export default function TradeEGLIFEPage() {
  const [ticker, setTicker] = useState<Ticker | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function loadTicker() {
    try {
      setLoading(true);
      setErr("");

      const provider = new JsonRpcProvider(BSC_RPC);
      const pair = new Contract(EGLIFE_USDT_POOL, PAIR_ABI, provider);

      const [reserve0, reserve1] = (await pair.getReserves()) as [
        bigint,
        bigint,
        bigint?
      ];

      // Assumption: reserve0 = USDT (18 dec), reserve1 = EGLIFE (18 dec)
      const usdtReserve = Number(formatUnits(reserve0, 18));
      const eglifeReserve = Number(formatUnits(reserve1, 18));

      if (eglifeReserve <= 0) {
        throw new Error("Invalid EGLIFE reserve from pool.");
      }

      const price = usdtReserve / eglifeReserve; // 1 EGLIFE in USDT
      const liquidityUSDT = usdtReserve * 2; // approx total LP

      // Abhi 24h change dummy rakhenge (0.0%), baad me API se la sakte hain
      const change24h = "0.0";

      setTicker({
        price: price.toFixed(6),
        change24h,
        liquidityUSDT: liquidityUSDT.toFixed(2),
        lastUpdated: new Date().toLocaleString(),
      });
    } catch (e: any) {
      console.error("loadTicker error", e);
      setErr(
        e?.message ||
          "Unable to load price from PancakeSwap pool. Please check network."
      );
      setTicker(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTicker();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-white px-4 py-6 flex justify-center">
      <div className="w-full max-w-6xl bg-slate-900/70 border border-slate-800 rounded-2xl p-5 shadow-xl">
        {/* Header + Ticker */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          <div>
            <h1 className="text-2xl font-semibold">
              Trade EGLIFE / USDT
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Spot market powered by PancakeSwap V2 liquidity — executed
              via EGPAYEDX Swap on BNB Smart Chain.
            </p>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <div className="bg-slate-800 rounded-xl px-3 py-2">
              <div className="text-[11px] text-slate-400">
                Last Price (USDT)
              </div>
              <div className="text-lg font-semibold">
                {ticker ? ticker.price : loading ? "Loading..." : "-"}
              </div>
            </div>
            <div className="bg-slate-800 rounded-xl px-3 py-2">
              <div className="text-[11px] text-slate-400">
                24h Change
              </div>
              <div className="text-lg font-semibold text-emerald-400">
                {ticker ? `${ticker.change24h}%` : "0.0%"}
              </div>
            </div>
            <button
              onClick={loadTicker}
              disabled={loading}
              className="px-3 py-1 text-xs bg-slate-800 rounded-full border border-slate-600 disabled:opacity-50"
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>

        {err && (
          <p className="text-xs text-red-400 mb-3 whitespace-pre-line">
            {err}
          </p>
        )}

        {/* Main layout: Chart + Order box */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Chart */}
          <div className="lg:col-span-2 bg-slate-900 rounded-xl border border-slate-700 overflow-hidden">
            <div className="px-3 py-2 border-b border-slate-800 flex items-center justify-between">
              <div className="text-sm font-semibold">
                EGLIFE / USDT Chart
              </div>
              <a
                href="https://geckoterminal.com/bsc/pools/0xa75f11504a5f171a1b6d4ba8dbf39bf44010fabc"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-emerald-400 underline"
              >
                Open on GeckoTerminal
              </a>
            </div>
            <div className="h-[420px]">
              {/* GeckoTerminal embed */}
              <iframe
                src="https://geckoterminal.com/bsc/pools/0xa75f11504a5f171a1b6d4ba8dbf39bf44010fabc?embed=1&info=0"
                title="EGLIFE/USDT Chart"
                className="w-full h-full border-0"
                loading="lazy"
              ></iframe>
            </div>
          </div>

          {/* Order box */}
          <div className="bg-slate-900 rounded-xl border border-slate-700 p-3 flex flex-col gap-3">
            <h2 className="text-sm font-semibold mb-1">
              Quick Trade (via Swap)
            </h2>

            <div className="grid grid-cols-2 gap-2 text-xs mb-2">
              <div className="bg-slate-800 rounded-lg p-2">
                <div className="text-[10px] text-slate-400 mb-1">
                  EGLIFE Price (approx)
                </div>
                <div className="text-base font-semibold">
                  {ticker ? `${ticker.price} USDT` : "-"}
                </div>
              </div>
              <div className="bg-slate-800 rounded-lg p-2">
                <div className="text-[10px] text-slate-400 mb-1">
                  Pool Liquidity (approx)
                </div>
                <div className="text-base font-semibold">
                  {ticker ? `${ticker.liquidityUSDT} USDT` : "-"}
                </div>
              </div>
            </div>

            {/* Buy card */}
            <div className="bg-emerald-900/20 border border-emerald-700 rounded-xl p-3">
              <div className="flex justify-between items-center mb-2">
                <div>
                  <div className="text-xs text-emerald-300 font-semibold">
                    Buy EGLIFE
                  </div>
                  <div className="text-[10px] text-slate-300">
                    With BNB or USDT using EGPAYEDX Swap
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  window.location.href = "/swap";
                }}
                className="mt-2 w-full py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 rounded-lg"
              >
                Open Swap to Buy EGLIFE
              </button>
            </div>

            {/* Sell card */}
            <div className="bg-red-900/20 border border-red-700 rounded-xl p-3">
              <div className="flex justify-between items-center mb-2">
                <div>
                  <div className="text-xs text-red-300 font-semibold">
                    Sell EGLIFE
                  </div>
                  <div className="text-[10px] text-slate-300">
                    Swap EGLIFE back to USDT or BNB
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  window.location.href = "/swap";
                }}
                className="mt-2 w-full py-2 text-xs font-semibold bg-red-600 hover:bg-red-500 rounded-lg"
              >
                Open Swap to Sell EGLIFE
              </button>
            </div>

            <p className="mt-1 text-[10px] text-slate-500">
              Note: Orders are executed as on-chain swaps via PancakeSwap
              router. EGPAYEDX does not custody your funds — you trade
              directly from your Web3 wallet.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}