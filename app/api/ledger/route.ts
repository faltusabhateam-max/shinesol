import { NextRequest } from "next/server";
import { getDocData, HttpError } from "@/lib/server-admin";
import { conn } from "@/lib/server-sol";
import { addLedger } from "@/lib/server-ledger";
import { FEE_WALLET, PROJECT_FEE_WALLET } from "@/lib/config";
import { fail, json } from "@/lib/server-route";
export const runtime = "nodejs";
export const maxDuration = 30;

/** Records the Shine fee of a client-sent transaction after verifying it on-chain. Anyone may submit; only real, matching transactions are recorded. */
export async function POST(req: NextRequest) {
  try {
    const { signature, kind, chatId } = await req.json().catch(() => ({}));
    if (typeof signature !== "string" || !/^[1-9A-HJ-NP-Za-km-z]{64,90}$/.test(signature)) throw new HttpError(400, "Invalid signature.");
    let tx = null;
    for (let i = 0; i < 6 && !tx; i++) { tx = await conn().getParsedTransaction(signature, { maxSupportedTransactionVersion: 0, commitment: "confirmed" }).catch(() => null); if (!tx) await new Promise((r) => setTimeout(r, 1500)); }
    if (!tx || tx.meta?.err) throw new HttpError(409, "Transaction not found or failed.");
    const legs = (tx.transaction.message.instructions as any[]).filter((ix) => ix.program === "system" && ix.parsed?.type === "transfer").map((ix) => ix.parsed.info as { source: string; destination: string; lamports: number });
    const at = tx.blockTime ? new Date(tx.blockTime * 1000) : new Date();
    const feeTo = kind === "payment" ? PROJECT_FEE_WALLET : FEE_WALLET;
    const fee = legs.filter((l) => l.destination === feeTo);
    const main = legs.filter((l) => l.destination !== feeTo);
    if (!fee.length || !main.length) return json({ recorded: false });
    const feeL = fee.reduce((s, l) => s + Number(l.lamports), 0), mainL = main.reduce((s, l) => s + Number(l.lamports), 0);
    if (kind === "payment") {
      const chat = typeof chatId === "string" && /^[A-Za-z0-9_-]{4,120}$/.test(chatId) ? await getDocData(`shine_chats/${chatId}`) : null;
      if (!chat) throw new HttpError(404, "Chat not found.");
      await addLedger({ type: "payout", source: "payment", lamports: mainL, signature, at, label: `Direct payment · ${chat.projectName} → @${chat.applicantUsername}`, chatId });
      await addLedger({ type: "fee", source: "payment", lamports: feeL, signature, at, label: "0.5% fee · direct project payment", chatId });
    } else {
      await addLedger({ type: "fee", source: "withdraw", lamports: feeL, signature, at, label: "0.2% fee · wallet withdrawal" });
    }
    return json({ recorded: true });
  } catch (e) { return fail(e); }
}
