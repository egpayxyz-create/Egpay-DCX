"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Backend base URL (future me yahi .env se change karoge)
const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5001";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Pehle backend se real login try karenge
      const res = await fetch(`${API_BASE}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      }).catch((err) => {
        // fetch hi fail (server nahi chal raha / CORS etc.)
        console.warn("Login API fetch failed:", err);
        throw new Error("OFFLINE");
      });

      if (!res || !res.ok) {
        // Agar response aaya par 200 nahi hai
        if (res && res.status === 401) {
          setError("Invalid email or password.");
          setLoading(false);
          return;
        }

        // Koi aur status code
        throw new Error("Login failed on server.");
      }

      const data = await res.json();

      // Yahan aap backend ka token use kar sakte hain
      const token = data.token || "egpaydcx-session-token";

      if (typeof window !== "undefined") {
        localStorage.setItem("token", token);
        localStorage.setItem("userEmail", email);
      }

      router.push("/");
    } catch (err: any) {
      console.warn("Login offline mode / error:", err);

      // Agar backend offline hai ya koi bhi fetch error hai → demo login
      if (err?.message === "OFFLINE" || err?.message === "Failed to fetch") {
        if (typeof window !== "undefined") {
          localStorage.setItem("token", "egpaydcx-demo-token");
          localStorage.setItem("userEmail", email || "demo@user.com");
        }
        // Optional: user ko bata den
        alert(
          "Backend server abhi offline hai.\nDemo mode me login ho gaye hain (frontend testing ke liye)."
        );
        router.push("/");
        return;
      }

      // Koi aur error
      setError(err?.message || "Unable to login.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white px-4">
      <div className="w-full max-w-md bg-slate-900/80 border border-slate-700 rounded-2xl p-6 shadow-xl">
        <h1 className="text-2xl font-semibold mb-1 text-center">
          EGPAYDCX Login
        </h1>
        <p className="text-xs text-slate-400 mb-4 text-center">
          Sign in to access your EGPAYEDX exchange dashboard.
        </p>

        {error && (
          <p className="text-xs text-red-400 mb-3 whitespace-pre-line">
            {error}
          </p>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-slate-300 mb-1">
              Email
            </label>
            <input
              type="email"
              required
              className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm outline-none focus:border-emerald-500"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs text-slate-300 mb-1">
              Password
            </label>
            <input
              type="password"
              required
              className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm outline-none focus:border-emerald-500"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-sm font-semibold"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <p className="mt-4 text-[10px] text-slate-500 text-center">
          Note: Agar backend (Node/Express API) nahi chal raha hai to aap
          demo mode me login ho jayenge, jisse frontend aur wallet flows
          easily test ho sakein.
        </p>
      </div>
    </div>
  );
}