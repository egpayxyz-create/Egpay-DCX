import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const coin = String(body.coin || "USDT");
    const inr = Number(body.inr || 0);
    const feeBps = Number(body.feeBps || 0);

    if (!Number.isFinite(inr) || inr <= 0) {
      return NextResponse.json({ error: "Invalid INR" }, { status: 400 });
    }
    if (!Number.isFinite(feeBps) || feeBps < 0 || feeBps > 1000) {
      return NextResponse.json({ error: "Invalid feeBps" }, { status: 400 });
    }

    // ✅ DEMO rates (अबhi hardcoded)
    const demoRates: Record<string, number> = {
      USDT: 90,
      BTC: 9000000,
      ETH: 350000,
      BNB: 65000,
      EGLIFE: 1, // demo
    };
    const rateInrPerCoin = demoRates[coin] ?? demoRates["USDT"];

    const feeInr = (inr * feeBps) / 10000;
    const totalInr = inr + feeInr;

    // receive amount based on INR (excluding fee) OR including? (यह policy आप decide करें)
    // यहाँ: user coin amount = inr / rate
    const coinAmount = inr / rateInrPerCoin;

    return NextResponse.json({
      coin,
      inr,
      feeBps,
      rateInrPerCoin,
      coinAmount,
      feeInr,
      totalInr,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}