import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const ids = ["bitcoin", "ethereum", "binancecoin", "ripple", "solana"].join(",");

    const url =
      "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=" +
      ids +
      "&order=market_cap_desc&per_page=5&page=1&sparkline=false&price_change_percentage=24h";

    const res = await fetch(url, {
      headers: {
        // CoinGecko sometimes blocks requests without UA
        "User-Agent": "EgpayDCX/1.0",
        "Accept": "application/json",
      },
      // optional timeout behavior handled by platform; keep simple
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: `Upstream error ${res.status}` },
        { status: 502 }
      );
    }

    const data = await res.json();
    return NextResponse.json({ ok: true, data });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Fetch failed" },
      { status: 500 }
    );
  }
}