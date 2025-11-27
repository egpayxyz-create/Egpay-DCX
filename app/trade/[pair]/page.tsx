"use client";

import React, { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5001";

type Order = {
  id: number;
  side: "BUY" | "SELL";
  price: number;
  amount: number;
  total: number;
  status?: string;
  finalAmount?: number;
  createdAt: number | string;
  time?: string;
};

type PageProps = {
  params: Promise<{ pair: string }>;
};

export default function TradePage({ params }: PageProps) {
  const { pair } = use(params);
  const router = useRouter();

  const [orders, setOrders] = useState<Order[]>([]);

  // 🔹 Buy ke liye alag fields
  const [buyPrice, setBuyPrice] = useState("");
  const [buyAmount, setBuyAmount] = useState("");

  // 🔹 Sell ke liye alag fields
  const [sellPrice, setSellPrice] = useState("");
  const [sellAmount, setSellAmount] = useState("");

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingOrders, setLoadingOrders] = useState(true);

  // 👉 Yahan se token teen alag keys se dhundhenge
  function getToken() {
    if (typeof window === "undefined") return null;

    const t =
      localStorage.getItem("egpaydcx_user_token") ||
      localStorage.getItem("egpaydcx_token") ||
      localStorage.getItem("token");

    console.log("TradePage token from storage:", t);
    return t;
  }

  useEffect(() => {
    async function loadOrders() {
      try {
        setLoadingOrders(true);
        const res = await fetch(
          `${API_BASE}/markets/${encodeURIComponent(pair)}/orders`,
          { cache: "no-store" }
        );
        const data = await res.json();
        if (!res.ok) {
          console.error("Load orders error:", res.status, data);
          setMessage(data.error || "Failed to load market orders");
          return;
        }
        setOrders(data);
      } catch (err) {
        console.error("Network error while loading orders", err);
        setMessage("Network error while loading orders");
      } finally {
        setLoadingOrders(false);
      }
    }
    loadOrders();
  }, [pair]);

  async function place(side: "BUY" | "SELL") {
    const token = getToken();
    if (!token) {
      setMessage("Please login first to place orders (token missing).");
      router.push("/login");
      return;
    }

    // 👉 side ke hisab se price/amount choose karo
    const priceStr = side === "BUY" ? buyPrice : sellPrice;
    const amountStr = side === "BUY" ? buyAmount : sellAmount;

    const numericPrice = Number(priceStr);
    const numericAmount = Number(amountStr);

    if (
      !numericPrice ||
      !numericAmount ||
      numericPrice <= 0 ||
      numericAmount <= 0
    ) {
      setMessage("Please enter valid price and amount.");
      return;
    }

    try {
      setLoading(true);
      setMessage("");

      const res = await fetch(`${API_BASE}/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          pair,
          side,
          price: numericPrice,
          amount: numericAmount,
          type: "LIMIT",
        }),
      });

      let data: any = {};
      try {
        data = await res.json();
      } catch {
        data = {};
      }

      console.log("Order response:", res.status, data);

      if (!res.ok) {
        setMessage(data.error || `Order failed (status ${res.status})`);
        return;
      }

      setMessage(
        `Order placed: ${side} ${numericAmount} at ${numericPrice}`
      );

      // 🔹 Sirf usi side ke fields clear karo
      if (side === "BUY") {
        setBuyPrice("");
        setBuyAmount("");
      } else {
        setSellPrice("");
        setSellAmount("");
      }

      if (data.order) {
        setOrders((prev) => [data.order, ...prev]);
      }
    } catch (err) {
      console.error("Network error while placing order", err);
      setMessage("Network error while placing order");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-black text-white p-6">
      <h1 className="text-2xl font-bold mb-2">Trade {pair}</h1>
      <p className="mb-4 text-sm text-gray-400">
        Demo centralised exchange engine (EgpayDCX)
      </p>

      {message && (
        <div className="mb-4 text-sm text-yellow-400">{message}</div>
      )}

      <section className="grid gap-6 md:grid-cols-2 mb-6">
        {/* Buy form */}
        <div className="bg-gray-900 p-4 rounded-xl space-y-3">
          <h2 className="text-lg font-semibold text-green-400">Buy</h2>
          <div>
            <label className="block text-sm mb-1">Price (quote)</label>
            <input
              type="number"
              value={buyPrice}
              onChange={(e) => setBuyPrice(e.target.value)}
              className="w-full bg-black border border-gray-700 rounded px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Amount (base)</label>
            <input
              type="number"
              value={buyAmount}
              onChange={(e) => setBuyAmount(e.target.value)}
              className="w-full bg-black border border-gray-700 rounded px-3 py-2 text-sm"
            />
          </div>
          <button
            disabled={loading}
            onClick={() => place("BUY")}
            className="w-full py-2 rounded bg-green-500 text-black font-semibold disabled:opacity-50"
          >
            {loading ? "Placing..." : "Place Buy Order"}
          </button>
        </div>

        {/* Sell form */}
        <div className="bg-gray-900 p-4 rounded-xl space-y-3">
          <h2 className="text-lg font-semibold text-red-400">Sell</h2>
          <div>
            <label className="block text-sm mb-1">Price (quote)</label>
            <input
              type="number"
              value={sellPrice}
              onChange={(e) => setSellPrice(e.target.value)}
              className="w-full bg-black border border-gray-700 rounded px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Amount (base)</label>
            <input
              type="number"
              value={sellAmount}
              onChange={(e) => setSellAmount(e.target.value)}
              className="w-full bg-black border border-gray-700 rounded px-3 py-2 text-sm"
            />
          </div>
          <button
            disabled={loading}
            onClick={() => place("SELL")}
            className="w-full py-2 rounded bg-red-500 text-black font-semibold disabled:opacity-50"
          >
            {loading ? "Placing..." : "Place Sell Order"}
          </button>
        </div>
      </section>

      {/* Recent trades */}
      <section className="bg-gray-900 p-4 rounded-xl">
        <h2 className="text-lg font-semibold mb-3">Recent trades</h2>

        {loadingOrders && <p>Loading trades...</p>}

        {!loadingOrders && !orders.length && (
          <p className="text-sm text-gray-400">No trades yet.</p>
        )}

        {orders.length > 0 && (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-1">Time</th>
                <th className="text-left py-1">Side</th>
                <th className="text-right py-1">Price</th>
                <th className="text-right py-1">Amount</th>
                <th className="text-right py-1">Total</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b border-gray-800">
                  <td className="py-1 text-xs">
                    {o.time ||
                      new Date(o.createdAt).toLocaleTimeString()}
                  </td>
                  <td
                    className={`py-1 text-xs ${
                      o.side === "BUY" ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {o.side}
                  </td>
                  <td className="py-1 text-right">{o.price}</td>
                  <td className="py-1 text-right">{o.amount}</td>
                  <td className="py-1 text-right">{o.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}