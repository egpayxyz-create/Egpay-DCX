import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { pair, side, amountIn } = body;

    if (!pair || !side || !amountIn) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // 🔹 TEMP BASE RATE
    // 1 USDT = 85 EGLIFE
    const BASE_RATE = 85;

    // 🔹 Spread = 0.5%
    const SPREAD_BPS = 50;
    const spreadMultiplier = 1 + SPREAD_BPS / 10000;

    const rate =
      side === "BUY"
        ? BASE_RATE * spreadMultiplier
        : BASE_RATE / spreadMultiplier;

    const amountOut = Number(amountIn) * rate;

    return NextResponse.json({
      success: true,
      pair,
      side,
      amountIn,
      rate,
      amountOut,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}