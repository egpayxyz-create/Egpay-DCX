"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5001";

type Stats = {
  totalMarkets: number;
  totalTrades: number;
  totalOrders: number;
  totalVolume: number;
  userBalance: Record<string, number>;
};

type User = {
  id: number;
  name: string;
  email: string;
  isAdmin?: boolean;
};

type Market = {
  pair: string;
  symbol: string;
  lastPrice: number;
  totalTrades: number;
};

export default function AdminDashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [selectedPair, setSelectedPair] = useState("");
  const [newPrice, setNewPrice] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("egpaydcx_admin_token");
    if (!token) {
      router.push("/admin/login");
      return;
    }

    async function load() {
      try {
        setLoading(true);
        setMessage("");

        const headers = { Authorization: `Bearer ${token}` };

        const [statsRes, usersRes, marketsRes] = await Promise.all([
          fetch(`${API_BASE}/admin/stats`, { headers }),
          fetch(`${API_BASE}/admin/users`, { headers }),
          fetch(`${API_BASE}/admin/markets`, { headers }),
        ]);

        if (!statsRes.ok) {
          setMessage("Not authorised or failed to load stats");
          if (statsRes.status === 401 || statsRes.status === 403) {
            localStorage.removeItem("egpaydcx_admin_token");
            router.push("/admin/login");
          }
          setLoading(false);
          return;
        }

        const statsData = await statsRes.json();
        const usersData = usersRes.ok ? await usersRes.json() : [];
        const marketsData = marketsRes.ok ? await marketsRes.json() : [];

        setStats(statsData);
        setUsers(usersData);
        setMarkets(marketsData);
        if (marketsData.length > 0) {
          setSelectedPair(marketsData[0].pair);
        }
      } catch (err) {
        console.error(err);
        setMessage("Network error while loading admin data");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [router]);

  async function handleUpdatePrice(e: React.FormEvent) {
    e.preventDefault();
    const token = localStorage.getItem("egpaydcx_admin_token");
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE}/admin/markets/update-price`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          pair: selectedPair,
          price: Number(newPrice),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || "Failed to update price");
        return;
      }

      setMessage("Price updated");

      setMarkets((prev) =>
        prev.map((m) =>
          m.pair === selectedPair ? { ...m, lastPrice: Number(newPrice) } : m
        )
      );
      setNewPrice("");
    } catch (err) {
      console.error(err);
      setMessage("Network error while updating price");
    }
  }

  function logout() {
    localStorage.removeItem("egpaydcx_admin_token");
    router.push("/admin/login");
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        Loading Admin Dashboard...
      </main>
    );
  }

  if (!stats) {
    return (
      <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-4">
        <p className="text-lg">
          Admin stats load nahi ho paaya. Ho sakta hai token expire ho gaya ho
          ya aap authorised na ho.
        </p>
        <button
          onClick={logout}
          className="px-4 py-2 bg-yellow-500 text-black rounded"
        >
          Admin login par wapas jao
        </button>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <header className="flex items-center justify-between px-8 py-4 border-b border-gray-800">
        <div>
          <h1 className="text-2xl font-bold">EgpayDCX Admin Dashboard</h1>
          {/* 👇 Merchant panel shortcut */}
          <Link
            href="/merchant-dashboard?merchantId=SHOP001"
            className="inline-block mt-2 px-3 py-1 rounded bg-yellow-400 text-black text-xs font-semibold"
          >
            Open Merchant Panel (SHOP001)
          </Link>
        </div>
        <div>
          <Link href="/" className="mr-4 text-gray-400">
            Home
          </Link>
          <button
            onClick={logout}
            className="px-4 py-1 bg-red-600 text-white rounded"
          >
            Logout
          </button>
        </div>
      </header>

      {message && (
        <div className="px-8 py-3 text-yellow-400 border-b border-gray-800">
          {message}
        </div>
      )}

      <section className="p-8 grid gap-6 md:grid-cols-4">
        <div className="bg-gray-900 p-4 rounded-xl">
          <h2>Total Markets</h2>
          <p className="text-2xl">{stats.totalMarkets}</p>
        </div>
        <div className="bg-gray-900 p-4 rounded-xl">
          <h2>Total Trades</h2>
          <p className="text-2xl">{stats.totalTrades}</p>
        </div>
        <div className="bg-gray-900 p-4 rounded-xl">
          <h2>Total Orders</h2>
          <p className="text-2xl">{stats.totalOrders}</p>
        </div>
        <div className="bg-gray-900 p-4 rounded-xl">
          <h2>Volume (24h approx)</h2>
          <p className="text-2xl">{stats.totalVolume}</p>
        </div>
      </section>

      <section className="px-8 pb-8 grid gap-8 md:grid-cols-2">
        {/* Markets and Price Update */}
        <div className="bg-gray-900 p-4 rounded-xl">
          <h2 className="text-lg mb-3">Markets</h2>
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th>Pair</th>
                <th>Last Price</th>
                <th>Trades</th>
              </tr>
            </thead>
            <tbody>
              {markets.map((m) => (
                <tr key={m.pair}>
                  <td>{m.symbol}</td>
                  <td>{m.lastPrice}</td>
                  <td>{m.totalTrades}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <form onSubmit={handleUpdatePrice} className="mt-4 space-y-3">
            <select
              className="w-full bg-black border p-2 rounded"
              value={selectedPair}
              onChange={(e) => setSelectedPair(e.target.value)}
            >
              {markets.map((m) => (
                <option key={m.pair} value={m.pair}>
                  {m.symbol}
                </option>
              ))}
            </select>

            <input
              type="number"
              placeholder="New Price"
              className="w-full bg-black border p-2 rounded"
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
            />

            <button className="w-full bg-yellow-500 text-black p-2 rounded">
              Update Price
            </button>
          </form>
        </div>

        {/* Users */}
        <div className="bg-gray-900 p-4 rounded-xl">
          <h2 className="text-lg mb-3">Registered Users</h2>
          <div className="max-h-96 overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>{u.name}</td>
                    <td>{u.email}</td>
                    <td>{u.isAdmin ? "Admin" : "User"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  );
}