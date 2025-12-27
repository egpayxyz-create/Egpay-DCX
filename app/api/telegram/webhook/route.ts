import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export const runtime = "nodejs";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.TELEGRAM_CHAT_ID; // optional but recommended

async function tg(method: string, body: any) {
  if (!BOT_TOKEN) {
    // Build/preview safe: don't crash. Just act like ok to avoid Telegram retries.
    return { ok: false, skipped: true, error: "Missing TELEGRAM_BOT_TOKEN" };
  }

  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json().catch(() => ({}));
}

function safeText(s: any) {
  return typeof s === "string" ? s : "";
}

export async function POST(req: Request) {
  try {
    // If token missing, don't break build or webhook. Return ok.
    if (!BOT_TOKEN) return NextResponse.json({ ok: true, skipped: true });

    const update = await req.json();

    if (update?.callback_query) {
      const cq = update.callback_query;

      const cbId: string = safeText(cq.id);
      const data: string = safeText(cq.data);
      const [actionRaw, orderIdRaw] = data.split(":");

      const action = (actionRaw || "").toUpperCase();
      const orderId = (orderIdRaw || "").trim();

      if (cbId) {
        await tg("answerCallbackQuery", {
          callback_query_id: cbId,
          text: "Received ✅",
          show_alert: false,
        });
      }

      if (!orderId || !["APPROVE", "REJECT"].includes(action)) {
        return NextResponse.json({ ok: true });
      }

      const chatId = cq.message?.chat?.id?.toString?.() ?? "";
      const messageId = cq.message?.message_id;

      // Only allow your admin chat
      if (ADMIN_CHAT_ID && chatId && chatId !== ADMIN_CHAT_ID) {
        if (chatId && messageId) {
          await tg("editMessageText", {
            chat_id: chatId,
            message_id: messageId,
            text: `❌ Not allowed.`,
          });
        }
        return NextResponse.json({ ok: true });
      }

      // Remove buttons immediately (prevent multiple clicks)
      if (chatId && messageId) {
        await tg("editMessageReplyMarkup", {
          chat_id: chatId,
          message_id: messageId,
          reply_markup: { inline_keyboard: [] },
        });
      }

      const newStatus = action === "APPROVE" ? "APPROVED" : "REJECTED";

      // Idempotent update
      const result = await pool.query(
        `
        update buy_crypto_orders
        set status = $2,
            updated_at = now(),
            admin_note = $3
        where id = $1
          and status = 'PENDING_CONFIRMATION'
        returning id, status
        `,
        [orderId, newStatus, `TG:${action}`]
      );

      const alreadyDone = result.rowCount === 0;

      if (chatId && messageId) {
        await tg("editMessageText", {
          chat_id: chatId,
          message_id: messageId,
          text:
            alreadyDone
              ? `EGPAYDCX Order Bot\n\nOrder: ${orderId}\n⚠️ Already processed earlier.`
              : `EGPAYDCX Order Bot\n\nOrder: ${orderId}\n✅ Status: ${newStatus}`,
        });
      }

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true });
  } catch {
    // Telegram retries avoid
    return NextResponse.json({ ok: true });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, route: "/api/telegram/webhook" });
}
