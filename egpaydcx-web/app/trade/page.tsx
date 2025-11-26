"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

type Side = "BUY" | "SELL";

type Order = {
  side: Side;
  price: number;
  amount: number;
  total: number;
  fee: number;
  finalAmount: number;
  time: string;
  pair?: string;
};

type Trade = Order;

type Balances = {
  usdt: number;
  btc: number;
  eglife: number;
  inr: number;
};

type PairMeta = {
  baseKey: keyof Balances;
  quoteKey: keyof Balances;
  baseSymbol: string;
  quoteSymbol: string;
};

// Helper: pair ke hisaab se base/quote decide
function getPairMeta(pairCode: string): PairMeta {
  switch (pairCode) {
    case "EGLIFE_USDT":
      return {
        baseKey: "eglife",
        quoteKey: "usdt",
        baseSymbol: "EGLIFE",
        quoteSymbol: "USDT",
      };
    case "EGLIFE_INR":
      return {
        baseKey: "eglife",
        quoteKey: "inr",
        baseSymbol: "EGLIFE",
        quoteSymbol: "INR",
      };
    case "BTC_USDT":
    default:
      return {
        baseKey: "btc",
        quoteKey: "usdt",
        baseSymbol: "BTC",
        quoteSymbol: "USDT",
      };
  }
}

function defaultPriceForPairCode(pairCode: string): string {
  switch (pairCode) {
    case "EGLIFE_USDT":
      return "0.0042";
    case "EGLIFE_INR":
      return "0.35";
    case "BTC_USDT":
    default:
      return "65000";
  }
}

// Helper: safe JSON fetch
async function safeJsonFetch(url: string) {
  const res = await fetch(url, { cache: "no-store" });
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch (e) {
    console.error("❌ Invalid JSON from", url);
    console.error(text);
    return null;
  }
}

export default function TradePairPage() {
  const params = useParams();
  const pairCode = (params.pair as string) || "BTC_USDT";
  const pairLabel = pairCode.replace("_", "/");

  const pairMeta = getPairMeta(pairCode);

  const [side, setSide] = useState<Side>("BUY");
  const [price, setPrice] = useState<string>(
    defaultPriceForPairCode(pairCode)
  );
  const [amount, setAmount] = useState<string>("0.1");
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [recentTrades, setRecentTrades] = useState<Trade[]>([]);
  const [balances, setBalances] = useState<Balances>({
    usdt: 0,
    btc: 0,
    eglife: 0,
    inr: 0,
  });

  // Login required
  useEffect(() => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("token");
    if (!token) {
      window.location.href = "/login";
    }
  }, []);

  // Jab pair change ho, default price reset
  useEffect(() => {
    setPrice(defaultPriceForPairCode(pairCode));
  }, [pairCode]);

  // Basic calculations
  const total =
    (parseFloat(price || "0") || 0) * (parseFloat(amount || "0") || 0);
  const feeRate = 0.002;
  const fee = total * feeRate;
  const finalAmount = side === "BUY" ? total + fee : total - fee;

  // Chart stats
  const prices = recentTrades.map((t) => t.price);
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const maxPrice = prices.length ? Math.max(...prices) : 0;
  const firstPrice = prices.length ? prices[prices.length - 1] : 0;
  const lastPrice = prices.length ? prices[0] : 0;
  const changePct =
    firstPrice > 0 ? ((lastPrice - firstPrice) / firstPrice) * 100 : 0;

  // Initial data load (per pair)
  useEffect(() => {
    async function fetchAll() {
      try {
        const [ordersData, balanceData, tradesData] = await Promise.all([
          safeJsonFetch(
            `http://localhost:5001/orders?pair=${encodeURIComponent(
              pairCode
            )}`
          ),
          safeJsonFetch("http://localhost:5001/balance"),
          safeJsonFetch(
            `http://localhost:5001/trades?pair=${encodeURIComponent(
              pairCode
            )}`
          ),
        ]);

        if (ordersData) setMyOrders(ordersData);
        if (balanceData) {
          setBalances({
            usdt: balanceData.usdt ?? 0,
            btc: balanceData.btc ?? 0,
            eglife: balanceData.eglife ?? 0,
            inr: balanceData.inr ?? 0,
          });
        }
        if (tradesData) setRecentTrades(tradesData);
      } catch (err) {
        console.error("Failed to load initial data", err);
      }
    }

    fetchAll();
  }, [pairCode]);

  // Place order (per pair, proper base/quote handling)
  const handleSubmit = async (e: any) => {
    e.preventDefault();

    const orderAmount = parseFloat(amount || "0") || 0;

    const baseBal = balances[pairMeta.baseKey];
    const quoteBal = balances[pairMeta.quoteKey];

    if (side === "BUY" && finalAmount > quoteBal) {
      alert(`Not enough ${pairMeta.quoteSymbol} balance for this BUY order.`);
      return;
    }
    if (side === "SELL" && orderAmount > baseBal) {
      alert(
        `Not enough ${pairMeta.baseSymbol} balance for this SELL order.`
      );
      return;
    }

    const newOrder: Order = {
      pair: pairCode,
      side,
      price: parseFloat(price || "0") || 0,
      amount: orderAmount,
      total,
      fee,
      finalAmount,
      time: new Date().toLocaleTimeString(),
    };

    // New balances copy
    const newBalances: Balances = { ...balances };

    if (side === "BUY") {
      // BUY: quote ghatta, base badhta
      newBalances[pairMeta.quoteKey] = quoteBal - finalAmount;
      newBalances[pairMeta.baseKey] = baseBal + orderAmount;
    } else {
      // SELL: base ghatta, quote badhta
      newBalances[pairMeta.baseKey] = baseBal - orderAmount;
      newBalances[pairMeta.quoteKey] = quoteBal + finalAmount;
    }

    try {
      // per-pair order save
      await fetch("http://localhost:5001/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newOrder),
      });

      // global wallet update (all balances send)
      await fetch("http://localhost:5001/balance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newBalances),
      });

      // refresh trades for this pair
      const tradesData = await safeJsonFetch(
        `http://localhost:5001/trades?pair=${encodeURIComponent(
          pairCode
        )}`
      );

      setBalances(newBalances);
      setMyOrders((prev) => [newOrder, ...prev]);
      if (tradesData) setRecentTrades(tradesData);

      alert(
        `Order Placed (${pairLabel}):
Side: ${side}
Price: ${newOrder.price}
Amount: ${newOrder.amount} ${pairMeta.baseSymbol}
Total: ${total.toFixed(6)} ${pairMeta.quoteSymbol}
Fee: ${fee.toFixed(6)} ${pairMeta.quoteSymbol}
Final: ${finalAmount.toFixed(6)} ${pairMeta.quoteSymbol}`
      );
    } catch (err) {
      console.error("Failed to place order", err);
      alert("Order failed – backend error");
    }
  };

  const getBarHeight = (price: number) => {
    if (!prices.length || maxPrice === minPrice) return 50;
    const ratio = (price - minPrice) / (maxPrice - minPrice || 1);
    return 20 + Math.max(0, Math.min(1, ratio)) * 70;
  };

  const baseBalance = balances[pairMeta.baseKey] || 0;
  const quoteBalance = balances[pairMeta.quoteKey] || 0;

  return (
    <main className="min-h-screen bg-black text-white p-8">
      <h1 className="text-3xl font-bold text-yellow-400 mb-6">
        EGPAYDCX Trade – {pairLabel}
      </h1>

      <div className="grid grid-cols-3 gap-6">
        {/* Orderbook (static demo for now) */}
        <div className="border border-yellow-500 p-4 rounded">
          <h2 className="text-xl font-bold mb-3">Orderbook</h2>

          <div>
            <h3 className="text-green-400 mb-2">Buy Orders</h3>
            <div className="space-y-1 text-sm">
              <p>Bid levels (demo)</p>
            </div>
          </div>

          <div className="mt-4">
            <h3 className="text-red-400 mb-2">Sell Orders</h3>
            <div className="space-y-1 text-sm">
              <p>Ask levels (demo)</p>
            </div>
          </div>
        </div>

        {/* Chart + Recent Trades */}
        <div className="border border-yellow-500 p-4 rounded">
          <h2 className="text-xl font-bold mb-3">Live Chart</h2>

          <div className="bg-gray-900 h-52 rounded p-3 flex flex-col">
            <div className="flex justify-between text-xs text-gray-300 mb-1">
              <span>
                Last Price:{" "}
                {lastPrice ? lastPrice.toFixed(6) : "--"}{" "}
                {pairMeta.quoteSymbol}
              </span>
              <span
                className={
                  changePct >= 0 ? "text-green-400" : "text-red-400"
                }
              >
                24h Change: {changePct.toFixed(2)}%
              </span>
            </div>

            <div className="flex-1 flex items-end gap-1 overflow-hidden">
              {recentTrades.length === 0 ? (
                <div className="w-full flex items-center justify-center text-gray-500 text-sm">
                  No trades yet. Place some orders to see chart.
                </div>
              ) : (
                recentTrades
                  .slice(0, 30)
                  .reverse()
                  .map((t, i) => (
                    <div
                      key={i}
                      className={`flex-1 rounded-t ${
                        t.side === "BUY"
                          ? "bg-green-500"
                          : "bg-red-500"
                      }`}
                      style={{ height: `${getBarHeight(t.price)}%` }}
                      title={`${t.time} • ${t.side} • ${t.price}`}
                    />
                  ))
              )}
            </div>

            {prices.length > 0 && (
              <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                <span>Low: {minPrice.toFixed(6)}</span>
                <span>High: {maxPrice.toFixed(6)}</span>
              </div>
            )}
          </div>

          <h2 className="text-xl font-bold mt-6 mb-2">Recent Trades</h2>
          <div className="bg-gray-900 p-2 rounded h-40 overflow-auto text-sm">
            {recentTrades.length === 0 ? (
              <p className="text-gray-500">No trades yet.</p>
            ) : (
              recentTrades.map((t, i) => (
                <p
                  key={i}
                  className={
                    t.side === "BUY" ? "text-green-400" : "text-red-400"
                  }
                >
                  {t.time} → {t.price} {pairMeta.quoteSymbol} |{" "}
                  {t.amount} {pairMeta.baseSymbol} ({t.side}) Fee:{" "}
                  {Number(t.fee ?? 0).toFixed(6)} | Final:{" "}
                  {Number(t.finalAmount ?? t.total).toFixed(6)}{" "}
                  {pairMeta.quoteSymbol}
                </p>
              ))
            )}
          </div>
        </div>

        {/* Form + Balance + My Orders */}
        <div className="border border-yellow-500 p-4 rounded">
          <div className="bg-gray-800 p-3 rounded mb-4 text-sm border border-gray-700">
            <h4 className="font-bold text-yellow-400">
              Wallet Balance (Demo)
            </h4>
            <p>
              {pairMeta.baseSymbol}:{" "}
              <span className="text-green-400">
                {baseBalance.toFixed(6)}
              </span>
            </p>
            <p>
              {pairMeta.quoteSymbol}:{" "}
              <span className="text-green-400">
                {quoteBalance.toFixed(6)}
              </span>
            </p>
          </div>

          <h2 className="text-xl font-bold mb-4">
            Place Order – {pairLabel}
          </h2>

          <div className="flex mb-4">
            <button
              type="button"
              onClick={() => setSide("BUY")}
              className={`flex-1 py-2 mr-1 rounded ${
                side === "BUY"
                  ? "bg-green-500 text-black"
                  : "bg-gray-800 text-gray-300"
              }`}
            >
              BUY
            </button>
            <button
              type="button"
              onClick={() => setSide("SELL")}
              className={`flex-1 py-2 ml-1 rounded ${
                side === "SELL"
                  ? "bg-red-500 text-black"
                  : "bg-gray-800 text-gray-300"
              }`}
            >
              SELL
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3 text-sm">
            <div>
              <label className="block mb-1 text-gray-300">
                Price ({pairMeta.quoteSymbol})
              </label>
              <input
                type="number"
                step="0.0000001"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full px-3 py-2 rounded bg-gray-900 border border-gray-700 focus:outline-none focus:border-yellow-400"
              />
            </div>

            <div>
              <label className="block mb-1 text-gray-300">
                Amount ({pairMeta.baseSymbol})
              </label>
              <input
                type="number"
                step="0.0000001"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2 rounded bg-gray-900 border border-gray-700 focus:outline-none focus:border-yellow-400"
              />
            </div>

            <div className="bg-gray-800 p-3 rounded text-sm border border-gray-700">
              <h4 className="font-bold mb-2 text-yellow-400">
                Order Summary
              </h4>

              <div className="flex justify-between">
                <span>Pair:</span>
                <span className="font-bold">{pairLabel}</span>
              </div>

              <div className="flex justify-between">
                <span>Order Type:</span>
                <span className="font-bold">{side}</span>
              </div>

              <div className="flex justify-between">
                <span>Price:</span>
                <span>
                  {price} {pairMeta.quoteSymbol}
                </span>
              </div>

              <div className="flex justify-between">
                <span>Amount:</span>
                <span>
                  {amount} {pairMeta.baseSymbol}
                </span>
              </div>

              <div className="flex justify-between">
                <span>Total:</span>
                <span>
                  {total.toFixed(6)} {pairMeta.quoteSymbol}
                </span>
              </div>

              <div className="flex justify-between text-red-300">
                <span>Fees (0.20%):</span>
                <span>
                  {fee.toFixed(6)} {pairMeta.quoteSymbol}
                </span>
              </div>

              <div className="flex justify-between font-bold text-green-400 mt-2 border-t border-gray-600 pt-2">
                <span>
                  {side === "BUY" ? "Final Cost:" : "You Receive:"}
                </span>
                <span>
                  {finalAmount.toFixed(6)} {pairMeta.quoteSymbol}
                </span>
              </div>
            </div>

            <button
              type="submit"
              className={`w-full mt-2 py-2 rounded font-bold ${
                side === "BUY"
                  ? "bg-green-500 text-black hover:bg-green-400"
                  : "bg-red-500 text-black hover:bg-red-400"
              }`}
            >
              {side === "BUY" ? "Place Buy Order" : "Place Sell Order"}
            </button>
          </form>

          <h2 className="text-xl font-bold mt-6 mb-2">
            My Orders – {pairLabel}
          </h2>
          <div className="bg-gray-900 p-2 rounded h-40 overflow-auto text-sm">
            {myOrders.length === 0 ? (
              <p className="text-gray-500">No orders yet.</p>
            ) : (
              myOrders.map((o, i) => (
                <p key={i}>
                  {o.time} → {o.side} | {o.price} @ {o.amount} | Fee:{" "}
                  {Number(o.fee ?? 0).toFixed(6)} | Final:{" "}
                  {Number(o.finalAmount ?? o.total).toFixed(6)}
                </p>
              ))
            )}
          </div>
        </div>
      </div>
    </main>
  );
}