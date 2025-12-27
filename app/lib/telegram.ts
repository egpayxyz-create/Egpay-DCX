// app/lib/telegram.ts
export function telegramConfig() {
  const token = process.env.TELEGRAM_BOT_TOKEN || "";
  const chatId = process.env.TELEGRAM_CHAT_ID || "";

  // Never throw at import/build time.
  // We'll handle missing config gracefully in runtime calls.
  return { token, chatId, enabled: !!token && !!chatId };
}

export async function tg(method: string, body: any) {
  const { token } = telegramConfig();

  if (!token) {
    // build-safe + preview-safe
    return { ok: false, skipped: true, error: "Missing TELEGRAM_BOT_TOKEN" };
  }

  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  return res.json().catch(() => ({}));
}

export async function notifyAdmin(text: string, keyboard?: any) {
  const { token, chatId, enabled } = telegramConfig();
  if (!enabled) return { ok: false, skipped: true };

  return tg("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    reply_markup: keyboard ? { inline_keyboard: keyboard } : undefined,
  });
}
