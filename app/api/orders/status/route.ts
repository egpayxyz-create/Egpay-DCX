import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const orderId = String(searchParams.get("orderId") || "").trim();
    const utr = String(searchParams.get("utr") || "").trim();

    if (!orderId && !utr) {
      return NextResponse.json({ ok: false, error: "Missing orderId or utr" }, { status: 400 });
    }

    const r = await pool.query(
      `
      select
        id, utr, status, tx_hash as "txHash", updated_at as "updatedAt",
        admin_note as "adminNote"
      from buy_crypto_orders
      where ${orderId ? "id=$1" : "utr=$1"}
      limit 1
      `,
      [orderId || utr]
    );

    if (r.rowCount === 0) {
      return NextResponse.json({
        ok: true,
        found: false,
        orderId: orderId || null,
        utr: utr || null,
        status: "NOT_FOUND",
      });
    }

    const order = r.rows[0];
    return NextResponse.json({
      ok: true,
      found: true,
      orderId: order.id,
      status: order.status,
      order,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Status fetch failed" }, { status: 500 });
  }
}
