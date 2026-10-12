import { NextRequest } from "next/server";
import { deleteDocPath, getDocData, setFields } from "@/lib/server-admin";
import { json } from "@/lib/server-route";
import { TELEGRAM_BOT_ENABLED } from "@/lib/server-tasks";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Telegram bot webhook: links a Shine account to a Telegram user id via /start <code>. */
export async function POST(req: NextRequest) {
  if (!TELEGRAM_BOT_ENABLED) return json({ ok: false, error: "disabled" }, 404);
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET, token = process.env.TELEGRAM_BOT_TOKEN;
  if (!secret || !token || req.headers.get("x-telegram-bot-api-secret-token") !== secret) return json({ ok: false }, 401);
  const u = await req.json().catch(() => ({}));
  const msg = u.message; const text: string = msg?.text || "";
  const m = text.match(/^\/start\s+([A-Za-z0-9]{8,32})$/);
  const reply = (t: string) => fetch(`https://api.telegram.org/bot${token}/sendMessage`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ chat_id: msg.chat.id, text: t }) }).catch(() => {});
  if (!m || !msg?.from?.id) { if (msg?.chat?.id) await reply("Open this bot from the Shine Tasks page to link your Telegram account."); return json({ ok: true }); }
  const c = await getDocData(`shine_tg_codes/${m[1]}`);
  if (!c?.uid || Date.now() - new Date(c.at).getTime() > 30 * 60_000) { await reply("This link expired. Please start again from Shine."); return json({ ok: true }); }
  await setFields(`shine_tg_links/${c.uid}`, { uid: c.uid, tgId: msg.from.id, tgUsername: msg.from.username || "", at: new Date() });
  await deleteDocPath(`shine_tg_codes/${m[1]}`).catch(() => {});
  await reply("Your Telegram is linked to Shine. Joins will be auto-verified.");
  return json({ ok: true });
}
