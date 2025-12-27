import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export const runtime = "nodejs";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.TELEGRAM_CHAT_ID; // recommended

if (!BOT_TOKEN) throw new Error("Missing TELEGRAM_BOT_TOKEN in .env.local");

// Telegram caller
async function tg(method: string, body: any) {
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
    const update = await req.json();

    // ---- CALLBACK (Approve/Reject) ----
    if (update?.callback_query) {
      const cq = update.callback_query;

      const cbId: string = safeText(cq.id);
      const data: string = safeText(cq.data); // "APPROVE:BC_xxx" / "REJECT:BC_xxx"
      const [actionRaw, orderIdRaw] = data.split(":");

      const action = (actionRaw || "").toUpperCase();
      const orderId = (orderIdRaw || "").trim();

      // stop spinner instantly
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

      // ✅ Security: allow only your admin chat (recommended)
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

      // ✅ HARD IDENTITY (optional but useful)
      const tgUserId = cq.from?.id ? String(cq.from.id) : "";
      const tgUsername = cq.from?.username ? `@${cq.from.username}` : "";
      const actor = [tgUsername, tgUserId ? `(${tgUserId})` : ""].filter(Boolean).join(" ");

      const newStatus = action === "APPROVE" ? "APPROVED" : "REJECTED";

      // ✅ PRODUCTION: transaction + row lock (prevents double approve)
      const client = await pool.connect();
      let alreadyDone = false;
      let finalStatus = "";
      try {
        await client.query("BEGIN");

        // lock row
        const row = await client.query(
          `
          select id, status
          from buy_crypto_orders
          where id = $1
          for update
          `,
          [orderId],
        );

        if (row.rowCount === 0) {
          alreadyDone = true;
          finalStatus = "NOT_FOUND";
          await client.query("COMMIT");
        } else {
          const current = String(row.rows[0].status || "");
          finalStatus = current;

          if (current !== "PENDING_CONFIRMATION") {
            // already processed earlier
            alreadyDone = true;
            await client.query("COMMIT");
          } else {
            // do update once
            await client.query(
              `
              update buy_crypto_orders
              set status = $2,
                  updated_at = now(),
                  admin_note = $3
              where id = $1
              `,
              [orderId, newStatus, `TG:${action}${actor ? ` by ${actor}` : ""}`],
            );

            finalStatus = newStatus;
            alreadyDone = false;

            await client.query("COMMIT");
          }
        }
      } catch (e) {
        try {
          await client.query("ROLLBACK");
        } catch {}
        // show minimal info on telegram
        if (chatId && messageId) {
          await tg("editMessageText", {
            chat_id: chatId,
            message_id: messageId,
            text: `EGPAYDCX Order Bot\n\nOrder: ${orderId}\n❌ Error: DB/Server issue`,
          });
        }
        client.release();
        return NextResponse.json({ ok: true });
      } finally {
        client.release();
      }

      // ✅ Remove buttons AFTER DB decision (safe UX)
      if (chatId && messageId) {
        await tg("editMessageReplyMarkup", {
          chat_id: chatId,
          message_id: messageId,
          reply_markup: { inline_keyboard: [] },
        });
      }

      // update message text
      if (chatId && messageId) {
        await tg("editMessageText", {
          chat_id: chatId,
          message_id: messageId,
          text:
            finalStatus === "NOT_FOUND"
              ? `EGPAYDCX Order Bot\n\nOrder: ${orderId}\n❌ Not found in DB.`
              : alreadyDone
                ? `EGPAYDCX Order Bot\n\nOrder: ${orderId}\n⚠️ Already processed earlier.\nCurrent: ${finalStatus}`
                : `EGPAYDCX Order Bot\n\nOrder: ${orderId}\n✅ Status: ${finalStatus}`,
        });
      }

      // ✅ IMPORTANT (next step):
      // If you trigger token transfer on APPROVED,
      // DO IT ONLY when current status was PENDING and you just set it to APPROVED (alreadyDone=false).
      // That guarantees single transfer.

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true });
  } catch {
    // Telegram retries avoid
    return NextResponse.json({ ok: true });
  }
}

// Health check
export async function GET() {
  return NextResponse.json({ ok: true, route: "/api/telegram/webhook" });
}
