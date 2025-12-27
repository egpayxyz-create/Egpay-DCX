import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

/* ---------- HELPERS ---------- */
function isValidEvmAddress(addr: string) {
  return /^0x[a-fA-F0-9]{40}$/.test(addr.trim());
}

function clamp(n: number, min: number, max: number) {
  return Math.min(Math.max(n, min), max);
}

function isValidRefByMethod(method: "UPI_LINK" | "BANK", ref: string) {
  const s = String(ref || "").trim();
  if (!s) return false;
  if (method === "UPI_LINK") return /^[0-9]{10,18}$/.test(s);
  return /^[A-Za-z0-9\-]{8,24}$/.test(s);
}

function roundInr(n: number) {
  // INR integer rounding
  return Math.round(n);
}

/* ---------- TELEGRAM HELPER ---------- */
async function notifyAdmin(text: string, keyboard: any) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) return { ok: false, skipped: true };

  const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      reply_markup: { inline_keyboard: keyboard },
    }),
  });

  const j = await r.json().catch(() => ({}));
  return { ok: !!j?.ok };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const utr = String(body.utr || "").trim();
    const coin = String(body.coin || "EGLIFE").trim() || "EGLIFE";
    const toAddress = String(body.toAddress || "").trim();
    const payMethod = (String(body.payMethod || "UPI_LINK").trim().toUpperCase() as "UPI_LINK" | "BANK");

    // Client numbers (never trust fully)
    const amountInrClient = Number(body.amountInr); // total
    const payInrClient = Number(body.payInr ?? 0);   // base
    const feeBpsClient = Number(body.feeBps ?? 0);
    const amountOutClient = Number(body.amountOut ?? 0);

    // Basic validations
    if (!utr) return NextResponse.json({ ok: false, message: "Missing utr" }, { status: 400 });
    if (!toAddress || !isValidEvmAddress(toAddress)) {
      return NextResponse.json({ ok: false, message: "Invalid toAddress" }, { status: 400 });
    }
    if (!Number.isFinite(payInrClient) || payInrClient <= 0) {
      return NextResponse.json({ ok: false, message: "Invalid payInr" }, { status: 400 });
    }
    if (!Number.isFinite(feeBpsClient)) {
      return NextResponse.json({ ok: false, message: "Invalid feeBps" }, { status: 400 });
    }
    if (payMethod !== "UPI_LINK" && payMethod !== "BANK") {
      return NextResponse.json({ ok: false, message: "Invalid payMethod" }, { status: 400 });
    }
    if (!isValidRefByMethod(payMethod, utr)) {
      return NextResponse.json({ ok: false, message: payMethod === "UPI_LINK" ? "Invalid UTR format" : "Invalid bank reference format" }, { status: 400 });
    }

    // Guardrails (match UI constraints)
    const minInr = 10;
    const maxInr = 500000;
    const payInr = clamp(roundInr(payInrClient), minInr, maxInr);

    const maxFeeBps = 500; // 5%
    const feeBps = clamp(Math.floor(feeBpsClient), 0, maxFeeBps);

    // ✅ Server-truth totals (tamper-proof)
    const feeInr = roundInr((payInr * feeBps) / 10000);
    const amountInr = payInr + feeInr;

    // Client total mismatch -> reject (prevents tampering / disputes)
    if (!Number.isFinite(amountInrClient) || roundInr(amountInrClient) !== amountInr) {
      return NextResponse.json(
        { ok: false, message: "Amount mismatch. Please refresh quote and try again." },
        { status: 400 },
      );
    }

    // ✅ Rate & amountOut should be server-defined.
    // Abhi demo rate 1 => amountOut = payInr (or you can do amountInr too, but consistent rakho)
    const rate = 1;
    const amountOut = payInr; // server decides output

    // Optional: if client sent amountOut, allow only if equal (extra safety)
    if (Number.isFinite(amountOutClient) && amountOutClient > 0 && roundInr(amountOutClient) !== amountOut) {
      return NextResponse.json(
        { ok: false, message: "Quote mismatch. Please refresh quote and try again." },
        { status: 400 },
      );
    }

    const orderId = "BC_" + randomUUID().replace(/-/g, "");

    // Map columns
    const cryptoAmount = amountOut;
    const walletAddress = toAddress;

    // Insert (requires UNIQUE(utr) in DB)
    try {
      await pool.query(
        `
        insert into buy_crypto_orders
        (
          id, utr, coin,
          amount_inr, pay_inr, fee_inr,
          rate, amount_out, crypto_amount,
          to_address, wallet_address,
          status,
          created_at, updated_at
          -- , pay_method  -- ✅ if column exists then enable
        )
        values
        (
          $1,$2,$3,
          $4,$5,$6,
          $7,$8,$9,
          $10,$11,
          'PENDING_CONFIRMATION',
          now(), now()
          -- , $12
        )
        `,
        [
          orderId, utr, coin,
          amountInr, payInr, feeInr,
          rate, amountOut, cryptoAmount,
          toAddress, walletAddress,
          // payMethod
        ],
      );
    } catch (e: any) {
      if (e?.code === "23505") {
        return NextResponse.json({ ok: false, message: "This reference/UTR is already used" }, { status: 409 });
      }
      return NextResponse.json({ ok: false, message: e?.message || "DB insert failed" }, { status: 500 });
    }

    const text =
      `🛎 <b>NEW BUY ORDER</b>\n\n` +
      `Coin: <b>${coin}</b>\n` +
      `Order ID: <code>${orderId}</code>\n` +
      `Ref/UTR: <code>${utr}</code>\n` +
      `Method: <b>${payMethod}</b>\n` +
      `Total Pay: ₹${amountInr}\n` +
      `Base Pay: ₹${payInr}\n` +
      `Fee (bps): ${feeBps}\n` +
      `Fee (INR): ₹${feeInr}\n` +
      `Rate: ${rate}\n` +
      `Token Out: <b>${amountOut}</b>\n` +
      `To:\n<code>${toAddress}</code>\n\n` +
      `Status: <b>PENDING_CONFIRMATION</b>`;

    await notifyAdmin(text, [
      [{ text: "✅ APPROVE", callback_data: `APPROVE:${orderId}` }],
      [{ text: "❌ REJECT", callback_data: `REJECT:${orderId}` }],
    ]);

    return NextResponse.json({
      ok: true,
      orderId,
      status: "PENDING_CONFIRMATION",
      message: "Order created. Admin confirmation pending.",
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message || "Server error" }, { status: 500 });
  }
}
