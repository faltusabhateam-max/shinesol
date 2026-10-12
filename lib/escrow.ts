// Shared (client + server) escrow definitions.
import { projectFee } from "./config";
export type PeriodStatus = "awaiting_funding" | "funded" | "due" | "released" | "refunded" | "disputed";
export type EscrowPeriod = {
  n: number; usd: number; lamports?: number | null; price?: number | null; status: PeriodStatus;
  fundTx?: string | null; fundedAt?: any; dueAt?: any; releaseTx?: string | null; releasedAt?: any; refundTx?: string | null;
  dispute?: { reason: string; at: any } | null; prevStatus?: PeriodStatus | null;
};
export type EscrowPlan = {
  id: string; chatId: string; projectUid: string; creatorUid: string; projectName: string; creatorUsername: string;
  usd: number; freq: "weekly" | "monthly"; status: "draft" | "active" | "off";
  creatorWallet: string; projectWallet?: string | null; periods: EscrowPeriod[];
  quote?: { lamports: number; price: number; usd: number; expiresAt: any } | null;
  offRequest?: { status: "pending" | "approved" | "denied"; reason: string; requestedAt: any; accessUntil?: any | null } | null;
  createdAt?: any; updatedAt?: any;
};
export const FREQ_DAYS = { weekly: 7, monthly: 30 } as const;
export const MIN_USD = 5, MAX_USD = 100000;
export const STATUS_META: Record<PeriodStatus, { label: string; tone: string }> = {
  awaiting_funding: { label: "Awaiting funding", tone: "text-amber-200 bg-amber-400/10 ring-amber-300/30" },
  funded: { label: "Funded", tone: "text-emerald-200 bg-emerald-400/10 ring-emerald-300/30" },
  due: { label: "Due", tone: "text-pink bg-pink/10 ring-pink/30" },
  released: { label: "Released", tone: "text-sky-200 bg-sky-400/10 ring-sky-300/30" },
  refunded: { label: "Refunded", tone: "text-white/70 bg-white/10 ring-white/20" },
  disputed: { label: "Disputed", tone: "text-red-200 bg-red-500/10 ring-red-400/30" },
};
export const currentPeriod = (p: EscrowPlan) => p.periods?.[p.periods.length - 1];
/** The exact message the project signs to release a period. Server rebuilds and compares it. */
export function releaseMessage(p: Pick<EscrowPlan, "chatId" | "creatorWallet">, per: Pick<EscrowPeriod, "n" | "lamports">) {
  return `Shine escrow release\n\nI confirm the work for this period is complete and authorize Shine to release the escrowed payment to the creator.\n\nChat: ${p.chatId}\nPeriod: #${per.n}\nAmount: ${((per.lamports || 0) / 1e9).toFixed(6)} SOL\nCreator receives: ${(((per.lamports || 0) - projectFee(per.lamports || 0)) / 1e9).toFixed(6)} SOL\nShine fee (0.5%): ${(projectFee(per.lamports || 0) / 1e9).toFixed(6)} SOL\nTo: ${p.creatorWallet}`;
}
export const SOL = (l?: number | null) => ((l || 0) / 1e9);
