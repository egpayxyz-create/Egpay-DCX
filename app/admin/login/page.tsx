"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@egpaydcx.com");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");

    try {
      const res = await fetch("http://localhost:5001/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.error || "Login failed");
        return;
      }

      if (!data.isAdmin) {
        setMessage("You are not authorised as admin.");
        return;
      }

      localStorage.setItem("egpaydcx_admin_token", data.token);
      router.push("/admin/dashboard");
    } catch (err) {
      console.error(err);
      setMessage("Network error");
    }
  }

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center">
      <form
        onSubmit={handleSubmit}
        className="bg-gray-900 p-8 rounded-xl w-full max-w-md space-y-4"
      >
        <h1 className="text-2xl font-bold mb-2">EgpayDCX Admin Login</h1>

        <div>
          <label className="block mb-1 text-sm">Admin Email</label>
          <input
            type="email"
            required
            className="w-full px-3 py-2 rounded bg-black border border-gray-700"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div>
          <label className="block mb-1 text-sm">Password</label>
          <input
            type="password"
            required
            className="w-full px-3 py-2 rounded bg-black border border-gray-700"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {message && <p className="text-sm text-yellow-400">{message}</p>}

        <button
          type="submit"
          className="w-full py-2 bg-yellow-500 text-black rounded font-semibold"
        >
          Login as Admin
        </button>
      </form>
    </main>
  );
}