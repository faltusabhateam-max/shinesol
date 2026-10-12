"use client";
import { fb } from "./firebase";
/** Ask the server to verify a just-confirmed transaction on-chain and add its Shine fee to the public ledger (fire-and-forget). */
export async function recordLedger(signature: string, kind: "withdraw" | "payment", chatId?: string) {
  try {
    const t = await fb().auth.currentUser?.getIdToken();
    await fetch("/api/ledger", { method: "POST", headers: { "content-type": "application/json", ...(t ? { "x-fb-token": t } : {}) }, body: JSON.stringify({ signature, kind, chatId }) });
  } catch {}
}
