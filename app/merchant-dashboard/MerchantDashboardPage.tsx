"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5001";

type Payment = {
  id: string;
  merchantId: string;
  userId: number;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
  paidAt: string;
};

export default function MerchantDashboardPage() {
  const searchParams = useSearchParams();
  const merchantId = searchParams.get("merchantId") || "SHOP001";

  const [payments, setPayments] = useState<Payment[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const adminToken =
          typeof window !== "undefined"
            ? localStorage.getItem("egpaydcx_admin_token")
            : null;

        if (!adminToken) {
          setMessage("Please login as admin first.");
          setLoading(false);
          return;
        }

        setLoading(true);
        const res = await fetch(
          `${API_BASE}/payments/merchant/${merchantId}`,
          {
            headers: {
              Authorization: `Bearer ${adminToken}`,
            },
          }
        );
        const data = await res.json();
        if (!res.ok) {
          setMessage(data.error || "Failed to load merchant payments");
          return;
        }
        setPayments(data);
        setMessage("");
      } catch (err) {
        console.error(err);
        setMessage("Network error while loading payments");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [merchantId]);

  return (
    <main className="min-h-screen bg-black text-white p-6">
      <h1 className="text-2xl font-bold mb-2">
        Merchant Dashboard – {merchantId}
      </h1>
      <p className="text-sm text-gray-400 mb-4">
        View all payments received via EGPAY Scan &amp; Pay.
      </p>

      {message && (
        <p className="mb-3 text-sm text-yellow-400 border border-yellow-700 rounded p-2">
          {message}
        </p>
      )}

      {loading ? (
        <p>Loading payments...</p>
      ) : payments.length === 0 ? (
        <p className="text-gray-400 text-sm">
          No payments received yet for this merchant.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm bg-gray-900 rounded">
            <thead>
              <tr className="bg-gray-800">
                <th className="px-3 py-2 text-left">Time</th>
                <th className="px-3 py-2 text-left">User ID</th>
                <th className="px-3 py-2 text-right">Amount</th>
                <th className="px-3 py-2 text-left">Currency</th>
                <th className="px-3 py-2 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr
                  key={p.id}
                  className="border-t border-gray-800 text-xs"
                >
                  <td className="px-3 py-1">
                    {new Date(p.paidAt || p.createdAt).toLocaleString()}
                  </td>
                  <td className="px-3 py-1">{p.userId}</td>
                  <td className="px-3 py-1 text-right">{p.amount}</td>
                  <td className="px-3 py-1">{p.currency}</td>
                  <td className="px-3 py-1 text-green-400">
                    {p.status}
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