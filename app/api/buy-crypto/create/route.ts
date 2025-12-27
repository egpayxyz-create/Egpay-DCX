import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      walletAddress,
      coin,
      payInr,
      rate,
      cryptoAmount
    } = body;

    if (!walletAddress || !coin || !payInr || !rate || !cryptoAmount) {
      return NextResponse.json(
        { ok: false, error: "Missing fields" },
        { status: 400 }
      );
    }

    const orderId = "BC_" + crypto.randomUUID().replace(/-/g, "");

    await pool.query(
      `
      insert into buy_crypto_orders
      (id, wallet_address, coin, pay_inr, rate, crypto_amount, status)
      values ($1,$2,$3,$4,$5,$6,'CREATED')
      `,
      [orderId, walletAddress, coin, payInr, rate, cryptoAmount]
    );

    return NextResponse.json({
      ok: true,
      orderId,
      status: "CREATED"
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e.message },
      { status: 500 }
    );
  }
}
