import { NextRequest } from "next/server";
import { Keypair } from "@solana/web3.js";
import { createOnce, getDocData, HttpError, queryDocs, queryOrdered, requireUser, setFields } from "@/lib/server-admin";
import { findByReference, LAMPORTS, solUsd, usdToLamports, verifyTransfer } from "@/lib/server-sol";
import { addLedger } from "@/lib/server-ledger";
import { audit } from "@/lib/server-escrow";
import { fail, json } from "@/lib/server-route";
import { FEE_WALLET } from "@/lib/config";
import { MAX_SUBTASKS, SUBTASK_TYPES, taskIssues, totalOf, type SubTask, type TaskProof } from "@/lib/tasks";
import { CHECKERS, claimId, loadClaim, loadTask, recount, reserveSlot, sweepExpired, taskPath, telegramEnabled } from "@/lib/server-tasks";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const pub = (t: any) => ({ id: t.id, creatorUid: t.creatorUid, creatorUsername: t.creatorUsername, creatorName: t.creatorName, creatorAvatar: t.creatorAvatar, title: t.title, description: t.description,
  subtasks: t.subtasks, rewardUsd: t.rewardUsd, limit: t.limit, totalUsd: t.totalUsd, rewardLamports: t.rewardLamports, status: t.status, claimed: t.claimed || 0, approved: t.approved || 0, createdAt: t.createdAt, fundingTx: t.fundingTx || null });

export async function GET(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id");
    if (id) { const t = await loadTask(id); if (!t || t.status === "funding") throw new HttpError(404, "Task not found."); return json({ task: pub(t) }); }
    const all = await queryOrdered("shine_tasks", "createdAt", "DESCENDING", 200);
    return json({ tasks: all.filter((t: any) => t.status === "open" || t.status === "completed").map(pub) });
  } catch (e) { return fail(e); }
}

const IMG = /^data:image\/(png|jpe?g|webp);base64,[A-Za-z0-9+/=]+$/;

export async function POST(req: NextRequest) {
  try {
    const { uid } = await requireUser(req.headers.get("authorization"));
    const b = await req.json().catch(() => ({}));
    switch (b.action) {
      case "create": {
        const subs: SubTask[] = (Array.isArray(b.subtasks) ? b.subtasks : []).slice(0, MAX_SUBTASKS).map((s: any, i: number) => ({
          id: String(s.id || `s${i}`).replace(/[^\w-]/g, "").slice(0, 16) || `s${i}`,
          type: SUBTASK_TYPES.some((x) => x.type === s.type) ? s.type : "custom",
          label: String(s.label || "").trim().slice(0, 120), link: String(s.link || "").trim().slice(0, 300),
          usd: Math.round(Number(s.usd) * 100) / 100 }));
        const t = { title: String(b.title || "").trim().slice(0, 100), description: String(b.description || "").trim().slice(0, 1500), subtasks: subs, limit: Math.floor(Number(b.limit)) };
        const issues = taskIssues(t); if (issues.length) throw new HttpError(400, issues[0]);
        const u = (await getDocData(`shine_users/${uid}`)) || {};
        const price = await solUsd();
        const rewardUsd = Math.round(subs.reduce((a, s) => a + s.usd, 0) * 100) / 100;
        const rewardLamports = usdToLamports(rewardUsd, price);
        const fundedLamports = rewardLamports * t.limit;
        const reference = Keypair.generate().publicKey.toBase58();
        const id = reference.slice(0, 20);
        await createOnce("shine_tasks", id, { ...t, creatorUid: uid, creatorUsername: u.username || "", creatorName: u.role === "project" && u.project?.name ? u.project.name : u.username || "", creatorAvatar: u.avatar || "",
          rewardUsd, totalUsd: totalOf(subs, t.limit), price, rewardLamports, fundedLamports, reference, status: "funding", claimed: 0, approved: 0, rejected: 0, paidLamports: 0, refundedLamports: 0, createdAt: new Date() });
        const sol = (fundedLamports / LAMPORTS).toFixed(9).replace(/0+$/, "").replace(/\.$/, "");
        const url = `solana:${FEE_WALLET}?amount=${sol}&reference=${reference}&label=Shine&message=${encodeURIComponent(`Shine Task · ${t.title}`)}`;
        return json({ id, reference, lamports: fundedLamports, sol: fundedLamports / LAMPORTS, usd: totalOf(subs, t.limit), price, recipient: FEE_WALLET, url });
      }
      case "fund_check": {
        const t = await loadTask(String(b.id || "")) as any;
        if (!t || t.creatorUid !== uid) throw new HttpError(404, "Campaign not found.");
        if (t.status !== "funding") return json({ paid: true, id: t.id });
        const sig = (typeof b.signature === "string" && b.signature) || (await findByReference(t.reference));
        if (!sig) return json({ paid: false });
        const v = await verifyTransfer(sig, { to: FEE_WALLET, minLamports: Math.floor(t.fundedLamports * 0.999), reference: t.reference });
        if (!(await createOnce("shine_escrow_tx", sig, { kind: "task_fund", uid, taskId: t.id, lamports: v.lamports, at: new Date() }))) {
          const again = await loadTask(t.id); if (again?.status !== "funding") return json({ paid: true, id: t.id });
          throw new HttpError(409, "This transaction was already used.");
        }
        await setFields(taskPath(t.id), { status: "open", fundingTx: sig, fundedLamports: v.lamports >= t.fundedLamports ? t.fundedLamports : v.lamports, receivedLamports: v.lamports, publishedAt: new Date(), createdAt: new Date() });
        await addLedger({ type: "escrow_fund", source: "task", lamports: v.lamports, signature: sig, label: `Task campaign funded · ${t.title.slice(0, 60)} (@${t.creatorUsername})`, uid });
        await audit({ type: "task_funded", uid, taskId: t.id, sig, lamports: v.lamports });
        return json({ paid: true, id: t.id, signature: sig });
      }
      case "claim": {
        let t = await loadTask(String(b.id || ""));
        if (!t || t.status === "funding") throw new HttpError(404, "Task not found.");
        if (t.creatorUid === uid) throw new HttpError(403, "You can't claim your own campaign.");
        const cid = claimId(t.id, uid);
        const existing = await loadClaim(cid);
        if (existing && existing.status !== "rejected") return json({ claim: existing });
        if (existing?.status === "rejected" && !(existing as any).expired) throw new HttpError(409, "Your claim for this campaign was rejected.");
        if (t.status !== "open") throw new HttpError(409, t.status === "completed" ? "All slots are taken." : "This campaign is closed.");
        await sweepExpired(t.id);
        const n = await reserveSlot(t, uid);
        if (n == null) { await recount(t.id); throw new HttpError(409, "All slots are taken."); }
        const u = (await getDocData(`shine_users/${uid}`)) || {};
        const claim = { taskId: t.id, uid, username: u.username || "", avatar: u.avatar || "", status: "reserved", proofs: {}, slot: n, taskTitle: t.title, rewardLamports: t.rewardLamports, createdAt: new Date() };
        await setFields(`shine_task_claims/${cid}`, claim);
        await recount(t.id);
        return json({ claim: { ...claim, id: cid } });
      }
      case "submit": {
        const t = await loadTask(String(b.id || ""));
        if (!t) throw new HttpError(404, "Task not found.");
        const cid = claimId(t.id, uid);
        const c = await loadClaim(cid);
        if (!c || !["reserved", "changes"].includes(c.status)) throw new HttpError(409, "Reserve a slot first.");
        const proofs: Record<string, TaskProof> = {};
        let bytes = 0;
        for (const s of t.subtasks) {
          const p = (b.proofs || {})[s.id] || {};
          const text = String(p.text || "").trim().slice(0, 300);
          const image = typeof p.image === "string" && IMG.test(p.image) && p.image.length < 340_000 ? p.image : "";
          bytes += image.length;
          if (!text && !image) throw new HttpError(400, `Add proof for “${s.label || SUBTASK_TYPES.find((x) => x.type === s.type)?.label}”.`);
          let auto: boolean | null = null;
          const chk = CHECKERS[s.type]; if (chk) auto = await chk(s, { uid, proof: text }).catch(() => null);
          proofs[s.id] = { text, image, ...(auto ? { auto: true } : {}) };
        }
        if (bytes > 850_000) throw new HttpError(400, "Screenshots are too large. Use smaller images.");
        await setFields(`shine_task_claims/${cid}`, { status: "submitted", proofs, submittedAt: new Date(), notice: "" });
        await recount(t.id);
        return json({ ok: true });
      }
      case "mine": {
        const [claims, mine] = await Promise.all([queryDocs("shine_task_claims", [["uid", "EQUAL", uid]], 200), queryDocs("shine_tasks", [["creatorUid", "EQUAL", uid]], 100)]);
        return json({ claims: claims.map((c: any) => ({ ...c, proofs: undefined })), campaigns: mine.map((t: any) => ({ ...pub(t), rejected: t.rejected || 0, submitted: t.submitted || 0, paidLamports: t.paidLamports || 0, refundedLamports: t.refundedLamports || 0, fundedLamports: t.fundedLamports })) });
      }
      case "my_claim": {
        const c = await loadClaim(claimId(String(b.id || ""), uid));
        return json({ claim: c ? { ...c, proofs: Object.fromEntries(Object.entries(c.proofs || {}).map(([k, v]: any) => [k, { text: v.text, auto: v.auto, hasImage: !!v.image }])) } : null, telegram: telegramEnabled() });
      }
      case "tg_link": {
        if (!telegramEnabled() || !process.env.TELEGRAM_BOT_USERNAME) throw new HttpError(503, "Telegram auto-verification isn't configured yet.");
        const code = Keypair.generate().publicKey.toBase58().slice(0, 16);
        await setFields(`shine_tg_codes/${code}`, { uid, at: new Date() });
        const linked = await getDocData(`shine_tg_links/${uid}`);
        return json({ url: `https://t.me/${process.env.TELEGRAM_BOT_USERNAME}?start=${code}`, linked: !!linked?.tgId });
      }
    }
    throw new HttpError(400, "Unknown action.");
  } catch (e) { return fail(e); }
}
