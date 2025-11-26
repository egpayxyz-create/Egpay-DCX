"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5001";

type Merchant = {
  id: string;
  name: string;
  egpayId: string;
  upi: string;
};

// 👇 INNER component – yahin saare hooks use honge
function PayPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const merchantId = searchParams.get("merchantId") || "";
  const presetAmount = searchParams.get("amount") || "";

  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [amount, setAmount] = useState(presetAmount);
  const [currency, setCurrency] = useState("INR");
  const [message, setMessage] = useState("");
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    async function loadMerchant() {
      if (!merchantId) return;
      try {
        const res = await fetch(`${API_BASE}/merchants/${merchantId}`);
        const data = await res.json();
        if (!res.ok) {
          setMessage(data.error || "Merchant not found");
          return;
        }
        setMerchant(data);
      } catch (err) {
        console.error(err);
        setMessage("Failed to load merchant");
      }
    }
    loadMerchant();
  }, [merchantId]);

  async function handlePay() {
    if (!merchantId) {
      setMessage("Invalid payment link (missing merchantId)");
      return;
    }

    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("egpaydcx_user_token")
        : null;

    if (!token) {
      setMessage("Please login first.");
      router.push("/login");
      return;
    }

    if (!amount || Number(amount) <= 0) {
      setMessage("Enter valid amount");
      return;
    }

    try {
      setPaying(true);
      setMessage("");

      const res = await fetch(`${API_BASE}/payments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          merchantId,
          amount: Number(amount),
          currency,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.error || "Payment failed");
        return;
      }

      setMessage("✅ Payment Successful!");

      // 🔊 Speaker sound
      try {
        const audio = new Audio("/sounds/payment-success.mp3");
        audio.play().catch(() => {
          // ignore autoplay errors
        });
      } catch (err) {
        console.error("Audio play error", err);
      }
    } catch (err) {
      console.error(err);
      setMessage("Network error while payment");
    } finally {
      setPaying(false);
    }
  }

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-gray-900 rounded-2xl p-6 space-y-4 shadow-lg">
        <h1 className="text-2xl font-bold text-yellow-400 mb-2">
          EGPAY – Scan & Pay
        </h1>

        {merchant ? (
          <div className="border border-gray-700 rounded-lg p-3 text-sm">
            <p className="font-semibold text-lg">{merchant.name}</p>
            <p className="text-gray-400">
              EGPAY ID:{" "}
              <span className="text-yellow-300">{merchant.egpayId}</span>
            </p>
            <p className="text-gray-400">
              UPI: <span className="text-yellow-300">{merchant.upi}</span>
            </p>
          </div>
        ) : (
          <p className="text-gray-400 text-sm">
            {merchantId
              ? "Loading merchant details..."
              : "Invalid payment link (no merchantId)."}
          </p>
        )}

        <div className="space-y-2">
          <label className="block text-sm text-gray-300">
            Amount to Pay
          </label>
          <input
            type="number"
            className="w-full px-3 py-2 rounded bg-black border border-gray-700 text-sm"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Enter amount"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm text-gray-300">Currency</label>
          <select
            className="w-full px-3 py-2 rounded bg-black border border-gray-700 text-sm"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
          >
            <option value="INR">INR (Fiat)</option>
            <option value="USDT">USDT</option>
            <option value="EGLIFE">EGLIFE Token</option>
          </select>
        </div>

        {message && (
          <p className="text-sm text-yellow-400 border border-yellow-700 rounded p-2">
            {message}
          </p>
        )}

        <button
          onClick={handlePay}
          disabled={paying}
          className="w-full py-2 rounded bg-green-500 text-black font-bold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {paying ? "Processing..." : "Pay Now"}
        </button>
      </div>
    </main>
  );
}

// 👇 OUTER page component – sirf Suspense wrapper
export default function PayPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-black text-white flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-gray-900 rounded-2xl p-6 space-y-4 shadow-lg">
            <h1 className="text-2xl font-bold text-yellow-400 mb-2">
              EGPAY – Scan & Pay
            </h1>
            <p className="text-sm text-gray-400">
              Loading payment details...
            </p>
          </div>
        </main>
      }
    >
      <PayPageInner />
    </Suspense>
  );
}