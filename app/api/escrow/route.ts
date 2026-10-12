import { NextRequest } from "next/server";
import { getDocData, HttpError, privySolWallets, requireUser } from "@/lib/server-admin";
import { solUsd, usdToLamports, vaultAddress, verifySolSignature, verifyTransfer, LAMPORTS } from "@/lib/server-sol";
import { audit, chatSystem, dueFrom, loadChat, loadPlan, releasePeriod, savePlan } from "@/lib/server-escrow";
import { createOnce, setFields } from "@/lib/server-admin";
import { MAX_USD, MIN_USD, releaseMessage, type EscrowPlan } from "@/lib/escrow";
import { fail, json } from "@/lib/server-route";
import { addLedger } from "@/lib/server-ledger";
export const runtime = "nodejs";
export const maxDuration = 60;

const QUOTE_MS = 15 * 60_000;

export async function POST(req: NextRequest) {
  try {
    const { did, uid } = await requireUser(req.headers.get("authorization"));
    const b = await req.json().catch(() => ({}));
    const chatId = String(b.chatId || "");
    const chat = await loadChat(chatId);
    const isProject = chat.projectUid === uid;
    if (!chat.members?.includes(uid)) throw new HttpError(403, "You're not part of this chat.");
    const plan = await loadPlan(chatId);
    const needProject = () => { if (!isProject) throw new HttpError(403, "Only the project can do this."); };
    const needPlan = (): EscrowPlan => { if (!plan) throw new HttpError(404, "No payment plan exists for this chat yet."); return plan; };

    switch (b.action) {
      case "plan": {
        needProject();
        if (plan && plan.status !== "draft") throw new HttpError(409, "Auto-payment is already on. The amount and schedule can't be changed by the project.");
        const usd = Math.round(Number(b.usd) * 100) / 100;
        if (!(usd >= MIN_USD && usd <= MAX_USD)) throw new HttpError(400, `Enter an amount between $${MIN_USD} and $${MAX_USD.toLocaleString()}.`);
        if (!["weekly", "monthly"].includes(b.freq)) throw new HttpError(400, "Choose weekly or monthly.");
        const creator = await getDocData(`shine_users/${chat.applicantUid}`);
        const app = await getDocData(`shine_applications/${chatId}`).catch(() => null);
        const creatorWallet = String(creator?.wallet || app?.wallet || "");
        if (creatorWallet.length < 32) throw new HttpError(409, "The creator hasn't set up a Solana wallet yet.");
        await savePlan(chatId, {
          chatId, projectUid: chat.projectUid, creatorUid: chat.applicantUid, projectName: chat.projectName, creatorUsername: chat.applicantUsername,
          usd, freq: b.freq, status: "draft", creatorWallet, periods: [{ n: 1, usd, status: "awaiting_funding" }], quote: null, offRequest: null,
          ...(plan ? {} : { createdAt: new Date() }),
        } as any);
        return json({ ok: true });
      }
      case "quote": {
        needProject();
        const p = needPlan();
        if (p.status === "off") throw new HttpError(409, "Auto-payment is off for this chat.");
        const cur = p.periods[p.periods.length - 1];
        if (!cur || cur.status !== "awaiting_funding") throw new HttpError(409, "The current period is already funded.");
        const price = await solUsd();
        const lamports = usdToLamports(cur.usd, price);
        const expiresAt = new Date(Date.now() + QUOTE_MS);
        await savePlan(chatId, { quote: { lamports, price, usd: cur.usd, expiresAt } });
        return json({ lamports, sol: lamports / LAMPORTS, price, usd: cur.usd, vault: vaultAddress(), expiresAt: expiresAt.toISOString(), period: cur.n });
      }
      case "fund": {
        needProject();
        const p = needPlan();
        const sig = String(b.signature || "");
        if (!/^[1-9A-HJ-NP-Za-km-z]{64,90}$/.test(sig)) throw new HttpError(400, "Invalid transaction signature.");
        const q = p.quote;
        if (!q || new Date(q.expiresAt).getTime() < Date.now() - 5 * 60_000) throw new HttpError(409, "The price quote expired. Please fund again.");
        const idx = p.periods.length - 1;
        const cur = p.periods[idx];
        if (cur.status !== "awaiting_funding") return json({ ok: true, already: true });
        const wallets = await privySolWallets(did);
        const v = await verifyTransfer(sig, { to: vaultAddress(), minLamports: Math.floor(q.lamports * 0.995), from: wallets.length ? wallets : undefined });
        if (!(await createOnce("shine_escrow_tx", sig, { chatId, kind: "fund", n: cur.n, lamports: v.lamports, at: new Date() }))) throw new HttpError(409, "This transaction was already used.");
        const now = new Date();
        const periods = [...p.periods];
        periods[idx] = { ...cur, status: "funded", lamports: v.lamports, price: q.price, fundTx: sig, fundedAt: now, dueAt: dueFrom(now, p.freq) };
        const first = p.status === "draft";
        await addLedger({ type: "escrow_fund", source: "escrow", lamports: v.lamports, signature: sig, label: `Escrow funding #${cur.n} · ${chat.projectName} → @${chat.applicantUsername}`, chatId });
        await savePlan(chatId, { periods, status: "active", projectWallet: v.source, quote: null });
        await chatSystem(chatId, first
          ? `Auto-payment is ON. ${chat.projectName} funded payment #${cur.n} (${(v.lamports / LAMPORTS).toFixed(4)} SOL ≈ $${cur.usd}) into the Shine vault. You can start work.`
          : `Payment #${cur.n} funded: ${(v.lamports / LAMPORTS).toFixed(4)} SOL ≈ $${cur.usd} is held in the Shine vault.`, { kind: "funded", amount: v.lamports / LAMPORTS, signature: sig });
        return json({ ok: true });
      }
      case "release": {
        needProject();
        const p = needPlan();
        const n = Number(b.n);
        const per = p.periods.find((x) => x.n === n);
        if (!per || !["funded", "due"].includes(per.status)) throw new HttpError(409, "This period isn't ready to release.");
        if (new Date(per.dueAt).getTime() > Date.now()) throw new HttpError(409, "This payment isn't due yet.");
        const msg = releaseMessage(p, per);
        if (String(b.message) !== msg) throw new HttpError(400, "The signed release message doesn't match.");
        const wallets = await privySolWallets(did);
        if (!wallets.some((w) => verifySolSignature(msg, String(b.signature || ""), w))) throw new HttpError(401, "Your wallet signature couldn't be verified.");
        const sig = await releasePeriod(p, n, uid);
        return json({ ok: true, signature: sig });
      }
      case "refund_request": {
        needProject();
        const p = needPlan();
        const n = Number(b.n);
        const idx = p.periods.findIndex((x) => x.n === n);
        const per = p.periods[idx];
        if (!per || !["funded", "due"].includes(per.status)) throw new HttpError(409, "Only funded payments can be disputed.");
        const reason = String(b.reason || "").trim().slice(0, 1000);
        if (reason.length < 10) throw new HttpError(400, "Please describe the issue (at least 10 characters).");
        const periods = [...p.periods];
        periods[idx] = { ...per, status: "disputed", prevStatus: per.status, dispute: { reason, at: new Date() } };
        await savePlan(chatId, { periods });
        await chatSystem(chatId, `${chat.projectName} requested a refund for payment #${n}. The Shine team will review it — funds stay locked in the vault until then.`, { kind: "disputed" });
        await audit({ type: "refund_request", chatId, n, by: uid, reason });
        return json({ ok: true });
      }
      case "creator_dispute": {
        // Creator reports the project when a due payment isn't confirmed. Opening a case consents to Shine reviewing this chat for the dispute.
        if (isProject || chat.applicantUid !== uid) throw new HttpError(403, "Only the creator can open a dispute.");
        const p = needPlan();
        const n = Number(b.n);
        const idx = p.periods.findIndex((x) => x.n === n);
        const per = p.periods[idx];
        const due = per && (per.status === "due" || (per.status === "funded" && per.dueAt && new Date(per.dueAt).getTime() <= Date.now()));
        if (!due) throw new HttpError(409, "You can open a dispute once a funded payment is due and hasn't been confirmed.");
        const reason = String(b.reason || "").trim().slice(0, 2000);
        if (reason.length < 20) throw new HttpError(400, "Describe the work you delivered (at least 20 characters).");
        const evidence = (Array.isArray(b.evidence) ? b.evidence : []).filter((x: any) => typeof x === "string" && /^data:image\//.test(x) && x.length < 260_000).slice(0, 3);
        const links = (Array.isArray(b.links) ? b.links : []).filter((x: any) => typeof x === "string" && /^https?:\/\/\S+$/.test(x)).map((x: string) => x.slice(0, 300)).slice(0, 5);
        const periods = [...p.periods];
        periods[idx] = { ...per, status: "disputed", prevStatus: per.status, dispute: { reason: reason.slice(0, 500), at: new Date(), by: "creator" } as any };
        await savePlan(chatId, { periods });
        await setFields(`shine_disputes/${chatId}_${n}`, { chatId, n, by: "creator", creatorUid: uid, projectUid: chat.projectUid, reason, links, evidence, status: "open", consent: true, openedAt: new Date() });
        await chatSystem(chatId, `@${chat.applicantUsername} opened a dispute for payment #${n}. Funds stay locked in the Shine Vault while the Shine team reviews the chat records and work evidence.`, { kind: "disputed" });
        await audit({ type: "creator_dispute", chatId, n, by: uid, evidence: evidence.length, links: links.length });
        return json({ ok: true });
      }
      case "off_request": {
        needProject();
        const p = needPlan();
        if (p.status !== "active") throw new HttpError(409, "Auto-payment isn't on.");
        if (p.offRequest?.status === "pending") return json({ ok: true, already: true });
        const reason = String(b.reason || "").trim().slice(0, 1000);
        if (reason.length < 10) throw new HttpError(400, "Please tell us why (at least 10 characters).");
        await savePlan(chatId, { offRequest: { status: "pending", reason, requestedAt: new Date(), accessUntil: null } });
        await audit({ type: "off_request", chatId, by: uid, reason });
        return json({ ok: true });
      }
      case "grant_access": {
        needProject();
        const p = needPlan();
        if (p.offRequest?.status !== "pending") throw new HttpError(409, "There's no pending request.");
        const accessUntil = new Date(Date.now() + 5 * 60_000);
        await savePlan(chatId, { offRequest: { ...p.offRequest, requestedAt: new Date(p.offRequest.requestedAt), accessUntil } });
        await chatSystem(chatId, `${chat.projectName} granted the Shine team read access to this chat for 5 minutes to review an auto-payment request.`, { kind: "access" });
        await audit({ type: "grant_access", chatId, by: uid, until: accessUntil });
        return json({ ok: true, accessUntil: accessUntil.toISOString() });
      }
      default: throw new HttpError(400, "Unknown action.");
    }
  } catch (e) { return fail(e); }
}
