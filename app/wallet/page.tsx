"use client";

import { useMemo, useState } from "react";

const mockMarkets = [
  { symbol: "BTC", name: "Bitcoin", price: 89831.58, chg: 0.04 },
  { symbol: "ETH", name: "Ethereum", price: 3157.17, chg: 1.64 },
  { symbol: "BNB", name: "BNB", price: 690.09, chg: -0.31 },
  { symbol: "XRP", name: "XRP", price: 1.99, chg: -0.74 },
  { symbol: "EGLIFE", name: "EGLIFE", price: 0.0012, chg: 3.91 },
];

const mockNewListings = [
  { symbol: "ASTR", name: "Aster", price: 0.909, chg: -3.91 },
  { symbol: "EGPAY", name: "EGPAY", price: 0.012, chg: 8.2 },
  { symbol: "MRC", name: "Marclife", price: 0.09, chg: 1.1 },
];

const mockNews = [
  { title: "EGPAYDCX: P2P marketplace module roadmap published", time: "2h ago" },
  { title: "Security: 2FA + device protection rollout", time: "6h ago" },
  { title: "Markets: Volatility update & risk notice", time: "1d ago" },
];

function formatMoney(n) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 8 }).format(n);
}

function Badge({ children }) {
  return (
    <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/80">
      {children}
    </span>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="text-xs text-white/60">{label}</div>
      <div className="mt-1 text-xl font-semibold text-white">{value}</div>
    </div>
  );
}

function MarketRow({ item }) {
  const isUp = item.chg >= 0;
  return (
    <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center text-sm font-semibold text-white">
          {item.symbol}
        </div>
        <div>
          <div className="text-sm font-semibold text-white">{item.symbol}</div>
          <div className="text-xs text-white/60">{item.name}</div>
        </div>
      </div>

      <div className="text-right">
        <div className="text-sm font-semibold text-white">${formatMoney(item.price)}</div>
        <div className={`text-xs ${isUp ? "text-emerald-400" : "text-rose-400"}`}>
          {isUp ? "+" : ""}{item.chg.toFixed(2)}%
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [tab, setTab] = useState("popular");
  const [q, setQ] = useState("");

  const markets = useMemo(() => {
    const base = tab === "popular" ? mockMarkets : mockNewListings;
    const filtered = base.filter(x =>
      (x.symbol + " " + x.name).toLowerCase().includes(q.toLowerCase())
    );
    return filtered;
  }, [tab, q]);

  return (
    <div className="min-h-screen bg-[#0b0f16] text-white">
      {/* Top bar */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0b0f16]/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-yellow-400/20 border border-yellow-400/30 flex items-center justify-center font-bold text-yellow-300">
              E
            </div>
            <div className="leading-tight">
              <div className="font-semibold">EGPAYDCX</div>
              <div className="text-xs text-white/60">Exchange</div>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-5 text-sm text-white/70">
            <a className="hover:text-white" href="#buy">Buy Crypto</a>
            <a className="hover:text-white" href="#markets">Markets</a>
            <a className="hover:text-white" href="#trade">Trade</a>
            <a className="hover:text-white" href="#futures">Futures</a>
            <a className="hover:text-white" href="#earn">Earn</a>
            <a className="hover:text-white" href="#p2p">P2P</a>
            <a className="hover:text-white" href="#support">Support</a>
          </nav>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center rounded-xl border border-white/10 bg-white/5 px-3 py-2">
              <input
                className="w-44 bg-transparent text-sm outline-none placeholder:text-white/40"
                placeholder="Search coins/news..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <a className="rounded-xl px-3 py-2 text-sm text-white/80 hover:bg-white/5" href="#login">Login</a>
            <a className="rounded-xl bg-yellow-400 px-4 py-2 text-sm font-semibold text-black hover:bg-yellow-300" href="#deposit">
              Deposit
            </a>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 py-10 md:grid-cols-2">
        {/* Left hero */}
        <section className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/5 to-transparent p-7">
          <div className="text-sm text-white/60">EGPAYDCX • The smart crypto & payments ecosystem</div>

          <h1 className="mt-5 text-4xl font-extrabold tracking-tight md:text-5xl">
            300,913,786
            <span className="block text-white/90">USERS TRUST US</span>
          </h1>

          <p className="mt-4 text-white/70">
            Fast onboarding • Secure wallet • Low fees • India-focused compliance-ready roadmap.
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            <Badge>Low Fees</Badge>
            <Badge>2FA + Device Lock</Badge>
            <Badge>P2P Marketplace (Coming)</Badge>
            <Badge>Earn / Staking (Planned)</Badge>
          </div>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <a href="#signup" className="rounded-2xl bg-yellow-400 px-5 py-3 text-center font-semibold text-black hover:bg-yellow-300">
              Sign Up
            </a>
            <a href="#trade" className="rounded-2xl border border-white/15 bg-white/5 px-5 py-3 text-center font-semibold text-white hover:bg-white/10">
              Start Trading
            </a>
          </div>

          <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Stat label="Customer First" value="24×7 Support" />
            <Stat label="Security" value="2FA + Alerts" />
            <Stat label="Speed" value="Fast Orders" />
          </div>

          <div className="mt-6 text-xs text-white/50">
            Risk Disclaimer: Crypto assets are volatile. This UI is for product preview; compliance + licensing steps required before public launch.
          </div>
        </section>

        {/* Right panel */}
        <aside className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="flex items-center justify-between">
            <div className="text-lg font-semibold">Markets</div>
            <div className="flex gap-2">
              <button
                onClick={() => setTab("popular")}
                className={`rounded-xl px-3 py-2 text-sm ${tab === "popular" ? "bg-white/10" : "text-white/60 hover:bg-white/5"}`}
              >
                Popular
              </button>
              <button
                onClick={() => setTab("new")}
                className={`rounded-xl px-3 py-2 text-sm ${tab === "new" ? "bg-white/10" : "text-white/60 hover:bg-white/5"}`}
              >
                New Listing
              </button>
            </div>
          </div>

          <div className="mt-4 grid gap-3">
            {markets.map((m) => <MarketRow key={m.symbol} item={m} />)}
            {markets.length === 0 && (
              <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-white/60">
                No results.
              </div>
            )}
          </div>

          <div className="mt-7">
            <div className="flex items-center justify-between">
              <div className="text-lg font-semibold">News</div>
              <a className="text-sm text-white/60 hover:text-white" href="#news">View All</a>
            </div>

            <div className="mt-3 grid gap-3">
              {mockNews.map((n, i) => (
                <div key={i} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="text-sm font-semibold">{n.title}</div>
                  <div className="mt-1 text-xs text-white/60">{n.time}</div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-black/20">
        <div className="mx-auto max-w-6xl px-4 py-10 text-sm text-white/60">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>© {new Date().getFullYear()} EGPAYDCX. All rights reserved.</div>
            <div className="flex gap-4">
              <a className="hover:text-white" href="#terms">Terms</a>
              <a className="hover:text-white" href="#privacy">Privacy</a>
              <a className="hover:text-white" href="#risk">Risk Disclosure</a>
              <a className="hover:text-white" href="#contact">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}