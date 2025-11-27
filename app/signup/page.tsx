"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      const res = await fetch("http://localhost:5001/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!data.success) {
        alert(data.error || "Signup failed");
        return;
      }

      alert("Signup successful! Please login.");
      router.push("/login");
    } catch (err) {
      console.error(err);
      alert("Server error, please try again.");
    }
  };

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="w-full max-w-md border border-yellow-500 rounded p-8 bg-gray-900">
        <h1 className="text-3xl font-bold mb-6 text-yellow-400">
          EGPAYDCX Signup
        </h1>

        <form className="space-y-4" onSubmit={onSubmit}>
          <div>
            <label className="block mb-1 text-sm text-gray-300">Full Name</label>
            <input
              className="w-full p-3 rounded bg-gray-800 border border-gray-700 focus:outline-none focus:border-yellow-400"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block mb-1 text-sm text-gray-300">Email</label>
            <input
              type="email"
              className="w-full p-3 rounded bg-gray-800 border border-gray-700 focus:outline-none focus:border-yellow-400"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block mb-1 text-sm text-gray-300">Password</label>
            <input
              type="password"
              className="w-full p-3 rounded bg-gray-800 border border-gray-700 focus:outline-none focus:border-yellow-400"
              placeholder="Minimum 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-3 rounded"
          >
            Create Account
          </button>
        </form>

        <p className="mt-4 text-sm text-gray-400">
          Already have an account?{" "}
          <a href="/login" className="text-yellow-400 underline">
            Login
          </a>
        </p>
      </div>
    </main>
  );
}