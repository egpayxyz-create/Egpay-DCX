"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type CoinRow = {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change24h: number;
};

function fmtUsd(n: number) {
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

export default function HomePage() {
  const [coins, setCoins] = useState<CoinRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/markets", { cache: "no-store" });
        const json = await res.json();
        const data = json?.data || [];

        const mapped: CoinRow[] = data.map((c: any) => ({
          id: c.id,
          symbol: String(c.symbol || "").toUpperCase(),
          name: c.name,
          price: Number(c.current_price),
          change24h: Number(c.price_change_percentage_24h),
        }));

        setCoins(mapped);
      } catch {
        setCoins([]);
      } finally {
        setLoading(false);
      }
    };

    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);

  return (
    <main className="bg-[#0b0f16] text-white">

      {/* ================= HERO ================= */}
      <section className="w-full px-6 py-16">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10">

          {/* LEFT */}
          <div className="lg:col-span-7">
            <h1 className="text-4xl md:text-6xl font-extrabold leading-tight">
              Trade Crypto <span className="text-yellow-400">Smarter</span>
              <br />
              with Egpay<span className="text-yellow-400">DCX</span>
            </h1>

            <p className="mt-5 text-white/70 max-w-xl">
              EgpayDCX is a next-generation crypto trading platform UI under
              development. Markets, Spot Trade, Wallet and P2P modules will be
              released phase-wise.
            </p>

            <div className="mt-8 flex gap-4">
              <Link
                href="/markets"
                className="bg-yellow-400 text-black px-6 py-3 rounded-xl font-semibold hover:bg-yellow-300"
              >
                View Markets
              </Link>
              <Link
                href="/login"
                className="border border-white/20 px-6 py-3 rounded-xl hover:bg-white/10"
              >
                Login
              </Link>
            </div>
          </div>

          {/* RIGHT: POPULAR COINS */}
          <div className="lg:col-span-5">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold">Popular</h3>
                <Link href="/markets" className="text-sm text-white/60 hover:text-white">
                  View all →
                </Link>
              </div>

              <div className="mt-4 divide-y divide-white/10">
                {loading && (
                  <div className="py-4 text-sm text-white/60">
                    Loading prices…
                  </div>
                )}

                {!loading && coins.length === 0 && (
                  <div className="py-4 text-sm text-white/60">
                    Prices unavailable
                  </div>
                )}

                {!loading &&
                  coins.map((c) => {
                    const up = c.change24h >= 0;
                    return (
                      <div
                        key={c.id}
                        className="py-3 flex justify-between items-center"
                      >
                        <div>
                          <div className="font-semibold text-sm">
                            {c.symbol}
                            <span className="text-white/50 font-normal">
                              {" "}· {c.name}
                            </span>
                          </div>
                          <div className="text-xs text-white/50">
                            24h change
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="font-semibold text-sm">
                            {fmtUsd(c.price)}
                          </div>
                          <div
                            className={`text-xs font-semibold ${
                              up ? "text-emerald-400" : "text-rose-400"
                            }`}
                          >
                            {up ? "+" : ""}
                            {c.change24h?.toFixed(2)}%
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= FEATURES ================= */}
      <section className="w-full px-6 py-14">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              title: "Live Markets",
              desc: "Track real-time crypto prices via public APIs.",
            },
            {
              title: "Spot Trading (Planned)",
              desc: "Simple and advanced trading UI under development.",
            },
            {
              title: "P2P & Wallet (Upcoming)",
              desc: "Peer-to-peer trading and asset wallet modules.",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-white/10 bg-white/5 p-6"
            >
              <div className="font-semibold">{f.title}</div>
              <p className="mt-2 text-sm text-white/70">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ================= SAFETY ================= */}
      <section className="w-full px-6 py-14">
        <div className="max-w-7xl mx-auto rounded-3xl border border-white/10 bg-white/5 p-8">
          <h2 className="text-2xl font-bold">Safety & Transparency</h2>
          <p className="mt-3 text-white/70 max-w-3xl">
            EgpayDCX is currently in development. We do not display fake user
            counts, volumes or awards. Risk disclosures and product status will
            always be clearly shown.
          </p>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-black/20 p-5 rounded-xl border border-white/10">
              <div className="font-semibold text-sm">Risk Warning</div>
              <p className="mt-2 text-sm text-white/70">
                Crypto trading involves high risk. Trade responsibly.
              </p>
            </div>
            <div className="bg-black/20 p-5 rounded-xl border border-white/10">
              <div className="font-semibold text-sm">No Fake Claims</div>
              <p className="mt-2 text-sm text-white/70">
                No false volumes, no fake certifications.
              </p>
            </div>
            <div className="bg-black/20 p-5 rounded-xl border border-white/10">
              <div className="font-semibold text-sm">Roadmap Based</div>
              <p className="mt-2 text-sm text-white/70">
                Features launch step-by-step with updates.
              </p>
            </div>
          </div>
        </div>
      </section>
</main>
  );
}