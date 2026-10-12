import "server-only";
import { createOnce } from "./server-admin";
import { solUsd, LAMPORTS } from "./server-sol";

export type LedgerType = "fee" | "payout" | "escrow_fund" | "escrow_refund" | "verify" | "affiliate" | "dispute";
/** Append an on-chain-verified entry to the public ledger. Idempotent per (signature, type, source). */
export async function addLedger(e: { type: LedgerType; source: string; lamports: number; signature: string; at?: Date; label?: string; chatId?: string; uid?: string }) {
  if (!e.lamports || e.lamports <= 0) return false;
  let price = 0;
  try { price = await solUsd(); } catch {}
  const sol = e.lamports / LAMPORTS;
  return createOnce("shine_ledger", `${e.signature}_${e.type}_${e.source}`.slice(0, 140), {
    type: e.type, source: e.source, lamports: e.lamports, sol, usd: price ? Math.round(sol * price * 100) / 100 : null, price: price || null,
    signature: e.signature, label: e.label || "", chatId: e.chatId || null, uid: e.uid || null, verified: true, at: e.at || new Date(), recordedAt: new Date(),
  }).catch(() => false);
}
