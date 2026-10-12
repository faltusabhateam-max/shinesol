import "server-only";
import { addDocData, createOnce, deleteDocPath, getDocData, HttpError, setFields } from "./server-admin";
import { conn, sendFromVault, vaultAddress, LAMPORTS } from "./server-sol";
import { FREQ_DAYS, type EscrowPeriod, type EscrowPlan } from "./escrow";
import { PROJECT_FEE_BPS, PROJECT_FEE_WALLET, projectFee } from "./config";
import { addLedger } from "./server-ledger";

export const planPath = (chatId: string) => `shine_escrow/${chatId}`;
export async function loadPlan(chatId: string): Promise<EscrowPlan | null> {
  if (!/^[A-Za-z0-9_-]{4,120}$/.test(chatId)) throw new HttpError(400, "Invalid chat.");
  const d = await getDocData(planPath(chatId));
  return d ? ({ id: chatId, ...d } as EscrowPlan) : null;
}
export async function loadChat(chatId: string) {
  const c = await getDocData(`shine_chats/${chatId}`);
  if (!c) throw new HttpError(404, "Chat not found.");
  return c as any;
}
const toISO = (v: any) => (v instanceof Date ? v : new Date(v));
/** Firestore REST stores dates; normalise periods for writing back. */
export const periodsOut = (ps: EscrowPeriod[]) => ps.map((p) => Object.fromEntries(Object.entries(p).map(([k, v]) => [k, typeof v === "string" && /At$/.test(k) && !isNaN(Date.parse(v)) ? new Date(v) : v && typeof v === "object" && !Array.isArray(v) && "at" in (v as any) ? { ...(v as any), at: toISO((v as any).at) } : v])));
export async function savePlan(chatId: string, data: Partial<EscrowPlan>) {
  const out: any = { ...data, updatedAt: new Date() };
  if (data.periods) out.periods = periodsOut(data.periods);
  await setFields(planPath(chatId), out);
}
export async function chatSystem(chatId: string, text: string, extra: Record<string, any> = {}) {
  await addDocData(`shine_chats/${chatId}/messages`, { senderUid: "shine", type: "escrow", text, ...extra, createdAt: new Date() });
  await setFields(`shine_chats/${chatId}`, { lastMessage: text.slice(0, 120), updatedAt: new Date() });
}
export const dueFrom = (from: Date, freq: EscrowPlan["freq"]) => new Date(from.getTime() + FREQ_DAYS[freq] * 86400_000);

/** Idempotent release of period n from the vault to the creator. */
export async function releasePeriod(plan: EscrowPlan, n: number, by: string) {
  const idx = plan.periods.findIndex((p) => p.n === n);
  const per = plan.periods[idx];
  if (!per || !["funded", "due", "disputed"].includes(per.status) || !per.lamports) throw new HttpError(409, "This period can't be released.");
  if (!(await createOnce("shine_escrow_tx", `release_${plan.chatId}_${n}`, { chatId: plan.chatId, n, by, at: new Date() }))) throw new HttpError(409, "This payment is already being released.");
  // 0.5% Shine fee is cut in the same release: it stays in / is sent to the Shine vault.
  const fee = projectFee(per.lamports), net = per.lamports - fee;
  let sig: string;
  try { sig = await sendFromVault(plan.creatorWallet, net, [{ to: PROJECT_FEE_WALLET, lamports: fee }]); }
  catch (e: any) { await deleteDocPath(`shine_escrow_tx/release_${plan.chatId}_${n}`).catch(() => {}); throw new HttpError(502, `Release failed on-chain: ${e?.message?.slice(0, 140) || "unknown error"}`); }
  await addLedger({ type: "payout", source: "escrow", lamports: net, signature: sig, label: `Escrow release #${n} · ${plan.projectName} → @${plan.creatorUsername}`, chatId: plan.chatId });
  await addLedger({ type: "fee", source: "escrow", lamports: fee, signature: sig, label: `${PROJECT_FEE_BPS / 100}% fee · escrow release #${n}`, chatId: plan.chatId });
  const periods = [...plan.periods];
  periods[idx] = { ...per, status: "released", releaseTx: sig, releasedAt: new Date(), dispute: per.dispute ?? null, feeLamports: fee } as any;
  if (plan.status === "active") periods.push({ n: n + 1, usd: plan.usd, status: "awaiting_funding" });
  await savePlan(plan.chatId, { periods });
  const sol = net / LAMPORTS;
  await setFields(`shine_transactions/${sig}`, { signature: sig, chatId: plan.chatId, fromUid: plan.projectUid, toUid: plan.creatorUid, from: vaultAddress(), to: plan.creatorWallet, amount: sol, kind: "escrow_release", label: `Auto-payment #${n} from ${plan.projectName}`, createdAt: new Date() });
  await chatSystem(plan.chatId, `Payment #${n} released: ${sol.toFixed(4)} SOL sent from the Shine vault to @${plan.creatorUsername} (Shine fee ${PROJECT_FEE_BPS / 100}%: ${(fee / LAMPORTS).toFixed(5)} SOL).`, { kind: "released", amount: sol, signature: sig, wallet: plan.creatorWallet });
  return sig;
}
export async function refundPeriod(plan: EscrowPlan, n: number, by: string) {
  const idx = plan.periods.findIndex((p) => p.n === n);
  const per = plan.periods[idx];
  if (!per || !["funded", "due", "disputed"].includes(per.status) || !per.lamports || !plan.projectWallet) throw new HttpError(409, "This period can't be refunded.");
  if (!(await createOnce("shine_escrow_tx", `release_${plan.chatId}_${n}`, { chatId: plan.chatId, n, by, refund: true, at: new Date() }))) throw new HttpError(409, "This period was already settled.");
  let sig: string;
  try { sig = await sendFromVault(plan.projectWallet, per.lamports); }
  catch (e: any) { await deleteDocPath(`shine_escrow_tx/release_${plan.chatId}_${n}`).catch(() => {}); throw new HttpError(502, `Refund failed on-chain: ${e?.message?.slice(0, 140) || "unknown error"}`); }
  await addLedger({ type: "escrow_refund", source: "escrow", lamports: per.lamports, signature: sig, label: `Escrow refund #${n} → ${plan.projectName}`, chatId: plan.chatId });
  const periods = [...plan.periods];
  periods[idx] = { ...per, status: "refunded", refundTx: sig, releasedAt: new Date() };
  if (plan.status === "active") periods.push({ n: n + 1, usd: plan.usd, status: "awaiting_funding" });
  await savePlan(plan.chatId, { periods });
  await chatSystem(plan.chatId, `Payment #${n} was refunded to ${plan.projectName} by the Shine team.`, { kind: "refunded", amount: per.lamports / LAMPORTS, signature: sig });
  return sig;
}
/** Dispute resolution: 70% to the creator, 30% stays in the Shine Vault. Idempotent. */
export async function splitPeriod(plan: EscrowPlan, n: number, by: string) {
  const idx = plan.periods.findIndex((p) => p.n === n);
  const per = plan.periods[idx];
  if (!per || per.status !== "disputed" || !per.lamports) throw new HttpError(409, "Only disputed payments can be split.");
  if (!(await createOnce("shine_escrow_tx", `release_${plan.chatId}_${n}`, { chatId: plan.chatId, n, by, split: true, at: new Date() }))) throw new HttpError(409, "This period was already settled.");
  const creator = Math.floor(per.lamports * 0.7), vaultShare = per.lamports - creator;
  let sig: string;
  try { sig = await sendFromVault(plan.creatorWallet, creator, [{ to: PROJECT_FEE_WALLET, lamports: vaultShare }]); }
  catch (e: any) { await deleteDocPath(`shine_escrow_tx/release_${plan.chatId}_${n}`).catch(() => {}); throw new HttpError(502, `Split failed on-chain: ${e?.message?.slice(0, 140) || "unknown error"}`); }
  await addLedger({ type: "payout", source: "dispute", lamports: creator, signature: sig, label: `Dispute resolution #${n} · 70% to @${plan.creatorUsername}`, chatId: plan.chatId });
  await addLedger({ type: "dispute", source: "dispute", lamports: vaultShare, signature: sig, label: `Dispute resolution #${n} · 30% to Shine Vault (${plan.projectName})`, chatId: plan.chatId });
  const periods = [...plan.periods];
  periods[idx] = { ...per, status: "released", releaseTx: sig, releasedAt: new Date(), resolution: "split_70_30" } as any;
  if (plan.status === "active") periods.push({ n: n + 1, usd: plan.usd, status: "awaiting_funding" });
  await savePlan(plan.chatId, { periods });
  const sol = creator / LAMPORTS;
  await setFields(`shine_transactions/${sig}`, { signature: sig, chatId: plan.chatId, fromUid: plan.projectUid, toUid: plan.creatorUid, from: vaultAddress(), to: plan.creatorWallet, amount: sol, kind: "escrow_release", label: `Dispute resolution #${n} (70%) from ${plan.projectName}`, createdAt: new Date() });
  await chatSystem(plan.chatId, `Dispute for payment #${n} resolved by the Shine team: 70% (${sol.toFixed(4)} SOL) sent to @${plan.creatorUsername}, 30% allocated to the Shine Vault under the Dispute Policy.`, { kind: "released", amount: sol, signature: sig, wallet: plan.creatorWallet });
  return sig;
}
export const audit = (entry: Record<string, any>) => addDocData("shine_audit", { ...entry, at: new Date() }).catch(() => {});
export { conn };
