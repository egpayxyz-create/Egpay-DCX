import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export const runtime = "nodejs";

function getBaseUrl(req: Request) {
  const envBase = process.env.BASE_URL?.trim() || process.env.NEXT_PUBLIC_BASE_URL?.trim();
  if (envBase) return envBase.replace(/\/$/, "");

  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") || "http";
  if (host) return `${proto}://${host}`;

  return "http://localhost:3001";
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const orderId = String(body.orderId || "").trim();

    if (!orderId) {
      return NextResponse.json({ ok: false, error: "Missing orderId" }, { status: 400 });
    }

    // 1) Load order
    const r0 = await pool.query(
      `
      select id, status, to_address, crypto_amount, coin
      from buy_crypto_orders
      where id=$1
      limit 1
      `,
      [orderId]
    );

    if (r0.rowCount === 0) {
      return NextResponse.json({ ok: false, error: "Order not found" }, { status: 404 });
    }

    const order = r0.rows[0];

    // ✅ idempotent
    if (order.status === "APPROVED") {
      return NextResponse.json({ ok: true, orderId, status: "APPROVED", message: "Already approved" });
    }
    if (order.status === "REJECTED") {
      return NextResponse.json({ ok: false, orderId, status: "REJECTED", error: "Order rejected" }, { status: 409 });
    }

    const to = String(order.to_address || "").trim();
    const amountOut = Number(order.crypto_amount ?? 0);

    if (!to || !Number.isFinite(amountOut) || amountOut <= 0) {
      return NextResponse.json({ ok: false, error: "Invalid order payout data" }, { status: 400 });
    }

    // 2) Call convert/execute to send token
    const baseUrl = getBaseUrl(req);
    const execPayload = {
      token: process.env.TOKEN_ADDRESS || process.env.EGLIFE_ADDRESS,
      tokenAddress: process.env.TOKEN_ADDRESS || process.env.EGLIFE_ADDRESS,
      coin: order.coin || "EGLIFE",
      to,
      payoutAddress: to,
      receiver: to,
      amountOut,
      tokenAmount: amountOut,
    };

    const exec = await fetch(`${baseUrl}/api/convert/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(execPayload),
      cache: "no-store",
    });

    const ej = await exec.json().catch(() => ({}));
    if (!exec.ok || !ej.ok) {
      // mark failed
      await pool.query(
        `
        update buy_crypto_orders
        set status='FAILED',
            admin_note=$2,
            updated_at=now()
        where id=$1
        `,
        [orderId, String(ej?.error || "Execute failed")]
      );

      return NextResponse.json({ ok: false, error: ej?.error || "Execute failed" }, { status: 500 });
    }

    // 3) Mark approved
    await pool.query(
      `
      update buy_crypto_orders
      set status='APPROVED',
          approved_at=now(),
          updated_at=now(),
          admin_note=$2
      where id=$1
      `,
      [orderId, `Tx: ${ej.txHash || "-"}`]
    );

    return NextResponse.json({
      ok: true,
      orderId,
      status: "APPROVED",
      txHash: ej.txHash || null,
      blockNumber: ej.blockNumber || null,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Unknown error" }, { status: 500 });
  }
}
