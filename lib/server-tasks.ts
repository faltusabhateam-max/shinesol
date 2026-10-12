import "server-only";
import { createOnce, deleteDocPath, getDocData, HttpError, listIds, privySolWallets, queryDocs, setFields } from "./server-admin";
import { LAMPORTS, sendFromVault, vaultAddress } from "./server-sol";
import { addLedger } from "./server-ledger";
import type { TaskCampaign, TaskClaim, SubTask } from "./tasks";

/** Telegram bot auto-verification is intentionally OFF: Telegram tasks use manual proof + Shine team review. */
export const TELEGRAM_BOT_ENABLED = false;
export const taskPath = (id: string) => `shine_tasks/${id}`;
export const claimId = (taskId: string, uid: string) => `${taskId}_${uid}`;
export const RESERVE_MS = 6 * 3600_000; // unsubmitted reservations expire after 6h

export async function loadTask(id: string): Promise<TaskCampaign | null> {
  if (!/^[\w-]{6,64}$/.test(id)) return null;
  const t = await getDocData(taskPath(id)); return t ? ({ ...t, id } as TaskCampaign) : null;
}
export async function loadClaim(id: string): Promise<TaskClaim | null> {
  const c = await getDocData(`shine_task_claims/${id}`); return c ? ({ ...c, id } as TaskClaim) : null;
}

/** Recount slots from claims (source of truth) and update campaign status. */
export async function recount(taskId: string) {
  const t = await loadTask(taskId); if (!t) return null;
  const claims = (await queryDocs("shine_task_claims", [["taskId", "EQUAL", taskId]], 20000)) as TaskClaim[];
  const now = Date.now();
  let claimed = 0, approved = 0, rejected = 0, submitted = 0;
  for (const c of claims) {
    if (c.status === "rejected") { rejected++; continue; }
    if (c.status === "reserved" && now - new Date(c.createdAt).getTime() > RESERVE_MS) continue;
    claimed++;
    if (c.status === "approved") approved++;
    if (c.status === "submitted") submitted++;
  }
  let status = t.status;
  if (t.status === "open" || t.status === "completed") status = claimed >= t.limit ? "completed" : "open";
  await setFields(taskPath(taskId), { claimed, approved, rejected, submitted, status, updatedAt: new Date() });
  return { ...t, claimed, approved, rejected, submitted, status } as TaskCampaign;
}

/** Slot reservation: slot docs `shine_task_slots/{taskId}_{n}` make reservations race-safe. */
export async function reserveSlot(t: TaskCampaign, uid: string) {
  const ids = new Set(await listSlotIds(t.id));
  for (let n = 0; n < t.limit; n++) {
    const id = `${t.id}_${n}`;
    if (ids.has(id)) continue;
    if (await createOnce("shine_task_slots", id, { taskId: t.id, n, uid, at: new Date() })) return n;
  }
  return null;
}
async function listSlotIds(taskId: string) {
  return (await queryDocs("shine_task_slots", [["taskId", "EQUAL", taskId]], 20000)).map((d: any) => d.id);
}
export const freeSlot = (taskId: string, n: number | undefined) => (n == null ? Promise.resolve() : deleteDocPath(`shine_task_slots/${taskId}_${n}`).catch(() => {}));

/** Release expired reservations so their slots reopen. */
export async function sweepExpired(taskId: string) {
  const claims = (await queryDocs("shine_task_claims", [["taskId", "EQUAL", taskId], ["status", "EQUAL", "reserved"]], 5000)) as any[];
  const now = Date.now();
  for (const c of claims) if (now - new Date(c.createdAt).getTime() > RESERVE_MS) {
    await freeSlot(taskId, c.slot);
    await setFields(`shine_task_claims/${claimId(taskId, c.uid)}`, { status: "rejected", note: "Reservation expired before submission.", expired: true, reviewedAt: new Date() });
  }
}

/** Pay the full reward from the vault. Idempotent via shine_escrow_tx/task_{claimId}. */
export async function payClaim(t: TaskCampaign, c: TaskClaim, by: string) {
  if (c.status === "approved") throw new HttpError(409, "Already approved.");
  if (!["submitted", "changes"].includes(c.status)) throw new HttpError(409, "This claim isn't awaiting review.");
  const remaining = t.fundedLamports - (t.paidLamports || 0) - (t.refundedLamports || 0);
  if (remaining < t.rewardLamports) throw new HttpError(409, "Campaign funds are exhausted.");
  const wallet = (await privySolWallets(c.uid))[0];
  if (!wallet) throw new HttpError(409, "The claimant has no Shine Wallet yet.");
  const key = `task_${c.id}`;
  if (!(await createOnce("shine_escrow_tx", key, { kind: "task_reward", taskId: t.id, uid: c.uid, by, at: new Date() }))) throw new HttpError(409, "This reward is already being paid.");
  let sig: string;
  try { sig = await sendFromVault(wallet, t.rewardLamports); }
  catch (e: any) { await deleteDocPath(`shine_escrow_tx/${key}`).catch(() => {}); throw new HttpError(502, `Payout failed on-chain: ${e?.message?.slice(0, 140) || "unknown error"}`); }
  await setFields(`shine_escrow_tx/${key}`, { signature: sig });
  await setFields(`shine_task_claims/${c.id}`, { status: "approved", payoutTx: sig, reviewedAt: new Date(), reviewedBy: by, note: "", notice: `Approved — ${(t.rewardLamports / LAMPORTS).toFixed(4)} SOL sent to your Shine Wallet.` });
  await setFields(taskPath(t.id), { paidLamports: (t.paidLamports || 0) + t.rewardLamports });
  await addLedger({ type: "payout", source: "task", lamports: t.rewardLamports, signature: sig, label: `Task reward · ${t.title.slice(0, 60)} → @${c.username}`, uid: c.uid });
  await setFields(`shine_transactions/${sig}`, { signature: sig, fromUid: "shine", toUid: c.uid, from: vaultAddress(), to: wallet, amount: t.rewardLamports / LAMPORTS, kind: "task_reward", label: `Task reward · ${t.title.slice(0, 60)}`, createdAt: new Date() });
  await recount(t.id);
  return sig;
}

/** Refund unused campaign funds to the creator (admin). Keeps enough for claims still awaiting review. */
export async function refundRemaining(t: TaskCampaign, by: string) {
  const claims = (await queryDocs("shine_task_claims", [["taskId", "EQUAL", t.id]], 20000)) as TaskClaim[];
  const pending = claims.filter((c) => c.status === "submitted" || c.status === "changes").length;
  if (pending) throw new HttpError(409, `Review the ${pending} pending claim(s) first.`);
  const amount = t.fundedLamports - (t.paidLamports || 0) - (t.refundedLamports || 0);
  if (amount <= 5000) throw new HttpError(409, "Nothing left to refund.");
  const wallet = (await privySolWallets(t.creatorUid))[0];
  if (!wallet) throw new HttpError(409, "The creator has no Shine Wallet.");
  const key = `task_refund_${t.id}_${(t.refundedLamports || 0)}`;
  if (!(await createOnce("shine_escrow_tx", key, { kind: "task_refund", taskId: t.id, by, at: new Date() }))) throw new HttpError(409, "A refund is already in progress.");
  let sig: string;
  try { sig = await sendFromVault(wallet, amount); }
  catch (e: any) { await deleteDocPath(`shine_escrow_tx/${key}`).catch(() => {}); throw new HttpError(502, `Refund failed on-chain: ${e?.message?.slice(0, 140) || "unknown error"}`); }
  for (const c of claims) if (c.status === "reserved") await setFields(`shine_task_claims/${c.id}`, { status: "rejected", note: "Campaign closed." });
  await setFields(taskPath(t.id), { status: "cancelled", refundedLamports: (t.refundedLamports || 0) + amount, refundTx: sig, cancelledAt: new Date(), cancelledBy: by });
  await addLedger({ type: "escrow_refund", source: "task", lamports: amount, signature: sig, label: `Task campaign refund · ${t.title.slice(0, 60)} → @${t.creatorUsername}`, uid: t.creatorUid });
  await setFields(`shine_transactions/${sig}`, { signature: sig, fromUid: "shine", toUid: t.creatorUid, from: vaultAddress(), to: wallet, amount: amount / LAMPORTS, kind: "task_refund", label: `Task campaign refund · ${t.title.slice(0, 60)}`, createdAt: new Date() });
  return { signature: sig, lamports: amount };
}

/* ---------- Auto-verification (pluggable) ---------- */
export type AutoCheck = (s: SubTask, ctx: { uid: string; proof?: string }) => Promise<boolean | null>; // null = can't check

/** Telegram: getChatMember with TELEGRAM_BOT_TOKEN (bot must be admin). Needs the user's linked Telegram id. */
const telegramCheck: AutoCheck = async (s, { uid }) => {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!TELEGRAM_BOT_ENABLED || !token) return null;
  const m = s.link.match(/t\.me\/(?!\+|joinchat)([A-Za-z0-9_]{4,})/);
  if (!m) return null; // private invite links can't be resolved
  const link = await getDocData(`shine_tg_links/${uid}`).catch(() => null);
  if (!link?.tgId) return null;
  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/getChatMember?chat_id=@${m[1]}&user_id=${link.tgId}`, { cache: "no-store" });
    const j = await r.json();
    if (!j.ok) return null;
    return ["member", "administrator", "creator", "restricted"].includes(j.result?.status) && j.result?.is_member !== false;
  } catch { return null; }
};
/** X: requires paid X API. Plug in an implementation (e.g. X_BEARER_TOKEN + follows lookup) here later. */
const xCheck: AutoCheck = async () => null;
export const CHECKERS: Partial<Record<SubTask["type"], AutoCheck>> = { tg_channel: telegramCheck, tg_group: telegramCheck, x_follow: xCheck, x_repost: xCheck, x_like: xCheck };
export const telegramEnabled = () => TELEGRAM_BOT_ENABLED && !!process.env.TELEGRAM_BOT_TOKEN;
export { listIds };
