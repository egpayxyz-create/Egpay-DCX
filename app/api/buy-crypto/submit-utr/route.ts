import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

async function notifyAdmin(text: string, keyboard: any) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) return { ok: false, skipped: true, reason: "TELEGRAM env missing" };

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
  return { ok: !!j?.ok, telegram: j };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const utr = String(body.utr || "").trim();
    const coin = String(body.coin || "EGLIFE").trim() || "EGLIFE";
    const toAddress = String(body.toAddress || "").trim();

    const totalPayInr = Number(body.amountInr);         // UI total (₹1005)
    const basePayInr = Number(body.payInr ?? 0);        // UI base (₹1000)
    const feeBps = Number(body.feeBps ?? 0);
    const amountOut = Number(body.amountOut ?? 0);      // token amount (1000)
    const rate = Number(body.rate ?? 1);                // ✅ rate NOT NULL fix

    // validations
    if (!utr || !toAddress || !Number.isFinite(totalPayInr) || totalPayInr <= 0) {
      return NextResponse.json({ ok: false, message: "Missing/invalid fields" }, { status: 400 });
    }
    if (!Number.isFinite(amountOut) || amountOut <= 0) {
      return NextResponse.json({ ok: false, message: "Invalid amountOut" }, { status: 400 });
    }

    // UTR format safety
    if (!/^[0-9A-Za-z]{8,24}$/.test(utr)) {
      return NextResponse.json({ ok: false, message: "Invalid UTR format" }, { status: 400 });
    }

    const orderId = "BC_" + randomUUID().replace(/-/g, "");

    const basePay = Number.isFinite(basePayInr) && basePayInr > 0 ? basePayInr : totalPayInr;
    const feeInr = Math.max(0, totalPayInr - basePay);

    // ✅ wallet_address: buyer ka payout (aap UI me "to" hi le rahe ho)
    const walletAddress = toAddress;

    // ✅ Insert into buy_crypto_orders (table columns match)
    try {
      await pool.query(
        `
        insert into buy_crypto_orders
        (id, utr, coin, amount_inr, fee_inr, amount_out, pay_inr, rate, crypto_amount, to_address, wallet_address, status, created_at, updated_at)
        values
        ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'PENDING_CONFIRMATION', now(), now())
        `,
        [
          orderId,
          utr,
          coin,
          totalPayInr,
          feeInr,
          amountOut,
          basePay,
          rate,              // ✅ rate
          amountOut,         // ✅ crypto_amount
          toAddress,
          walletAddress,
        ]
      );
    } catch (e: any) {
      if (e?.code === "23505") {
        return NextResponse.json({ ok: false, message: "This UTR is already used" }, { status: 409 });
      }
      return NextResponse.json({ ok: false, message: e?.message || "DB insert failed" }, { status: 500 });
    }

    const text =
      `🛎 <b>NEW BUY ORDER</b>\n\n` +
      `Coin: <b>${coin}</b>\n` +
      `Order ID: <code>${orderId}</code>\n` +
      `UTR: <code>${utr}</code>\n` +
      `Total Pay: ₹${totalPayInr}\n` +
      `Base Pay: ₹${basePay}\n` +
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
