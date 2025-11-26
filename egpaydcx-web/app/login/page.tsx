"use client";

import { useState } from "react";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const res = await fetch("http://localhost:5001/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        alert("Login failed. Check email/password.");
        return;
      }

      const data = await res.json();

      if (!data.token) {
        alert("Login failed – token not received.");
        return;
      }

      if (typeof window !== "undefined") {
        localStorage.setItem("token", data.token);
        localStorage.setItem("email", email); // ✅ yahi naya hai
      }

      alert("Login successful!");

      if (typeof window !== "undefined") {
        window.location.href = "/trade/BTC_USDT";
      }
    } catch (err) {
      console.error("Login error", err);
      alert("Login request failed – backend not reachable?");
    }
  };

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="w-full max-w-md bg-gray-900 p-8 rounded-lg border border-yellow-500 shadow-lg">
        <h1 className="text-2xl font-bold text-yellow-400 mb-6 text-center">
          EGPAYDCX Login
        </h1>

        <form className="space-y-4" onSubmit={onSubmit}>
          <div>
            <label className="block mb-1 text-sm text-gray-300">Email</label>
            <input
              type="email"
              className="w-full p-3 rounded bg-gray-800 border border-gray-700 focus:outline-none focus:border-yellow-400"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              suppressHydrationWarning
            />
          </div>

          <div>
            <label className="block mb-1 text-sm text-gray-300">
              Password
            </label>
            <input
              type="password"
              className="w-full p-3 rounded bg-gray-800 border border-gray-700 focus:outline-none focus:border-yellow-400"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              suppressHydrationWarning
            />
          </div>

          <button
            type="submit"
            className="w-full bg-green-500 hover:bg-green-400 text-black font-bold py-3 rounded"
            suppressHydrationWarning
          >
            Login
          </button>
        </form>
      </div>
    </main>
  );
}