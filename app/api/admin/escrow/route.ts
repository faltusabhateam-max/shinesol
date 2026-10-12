import { NextRequest } from "next/server";
import { getDocData, HttpError, listDocs, requireAdmin, setFields } from "@/lib/server-admin";
import { vaultAddress, vaultBalance } from "@/lib/server-sol";
import { audit, chatSystem, loadPlan, refundPeriod, releasePeriod, savePlan, splitPeriod } from "@/lib/server-escrow";
import { fail, json } from "@/lib/server-route";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req.headers.get("authorization"));
    const b = await req.json().catch(() => ({}));
    if (b.action === "vault") {
      let balance: number | null = null, address: string | null = null, error: string | null = null;
      try { address = vaultAddress(); balance = await vaultBalance(); } catch (e: any) { error = e?.message || "Vault unavailable"; }
      return json({ address, balance, error });
    }
    const chatId = String(b.chatId || "");
    const plan = await loadPlan(chatId);
    if (!plan) throw new HttpError(404, "Plan not found.");
    const n = Number(b.n);
    const wasDisputed = plan.periods.find((x) => x.n === n)?.status === "disputed";
    switch (b.action) {
      case "release": { const sig = await releasePeriod(plan, n, `admin:${admin.uid}`); if (wasDisputed) await setFields(`shine_disputes/${chatId}_${n}`, { status: "resolved", resolution: "release", resolvedBy: admin.email, resolvedAt: new Date() }).catch(() => {}); await audit({ type: "admin_release", chatId, n, by: admin.email }); return json({ ok: true, signature: sig }); }
      case "refund": { const sig = await refundPeriod(plan, n, `admin:${admin.uid}`); if (wasDisputed) await setFields(`shine_disputes/${chatId}_${n}`, { status: "resolved", resolution: "refund", resolvedBy: admin.email, resolvedAt: new Date() }).catch(() => {}); await audit({ type: "admin_refund", chatId, n, by: admin.email }); return json({ ok: true, signature: sig }); }
      case "deny": {
        const idx = plan.periods.findIndex((p) => p.n === n);
        const per = plan.periods[idx];
        if (!per || per.status !== "disputed") throw new HttpError(409, "This period isn't disputed.");
        const periods = [...plan.periods];
        periods[idx] = { ...per, status: per.prevStatus || "funded", prevStatus: null };
        await savePlan(chatId, { periods });
        await chatSystem(chatId, `The Shine team reviewed the refund request for payment #${n} and declined it. The payment stays in escrow for release.`, { kind: "info" });
        await audit({ type: "admin_deny_refund", chatId, n, by: admin.email });
        return json({ ok: true });
      }
      case "off": {
        await savePlan(chatId, { status: "off", offRequest: plan.offRequest ? { ...plan.offRequest, requestedAt: new Date(plan.offRequest.requestedAt), accessUntil: null, status: "approved" } : null });
        const cur = plan.periods[plan.periods.length - 1];
        if (cur?.status === "awaiting_funding") await savePlan(chatId, { periods: plan.periods.slice(0, -1) });
        await chatSystem(chatId, "The Shine team turned auto-payment off for this chat. Any funds still in escrow will be released or refunded by the Shine team.", { kind: "off" });
        await audit({ type: "admin_off", chatId, by: admin.email });
        return json({ ok: true });
      }
      case "deny_off": {
        if (!plan.offRequest) throw new HttpError(409, "No request.");
        await savePlan(chatId, { offRequest: { ...plan.offRequest, requestedAt: new Date(plan.offRequest.requestedAt), accessUntil: null, status: "denied" } });
        await chatSystem(chatId, "The Shine team reviewed the request to turn auto-payment off and kept it on.", { kind: "info" });
        await audit({ type: "admin_deny_off", chatId, by: admin.email });
        return json({ ok: true });
      }
      case "split": {
        const sig = await splitPeriod(plan, n, `admin:${admin.uid}`);
        await setFields(`shine_disputes/${chatId}_${n}`, { status: "resolved", resolution: "split_70_30", resolvedBy: admin.email, resolvedAt: new Date() }).catch(() => {});
        await audit({ type: "admin_dispute_split", chatId, n, by: admin.email });
        return json({ ok: true, signature: sig });
      }
      case "dispute_case": {
        // Evidence review: allowed for a creator-opened dispute (the creator consented when opening it) or within the project's 5-minute grant.
        const per = plan.periods.find((x) => x.n === n);
        const d = await getDocData(`shine_disputes/${chatId}_${n}`);
        const until = plan.offRequest?.accessUntil ? new Date(plan.offRequest.accessUntil).getTime() : 0;
        const allowed = (per?.status === "disputed" && d?.consent) || until > Date.now();
        let messages: any[] | null = null;
        if (allowed) {
          const msgs = (await listDocs(`shine_chats/${chatId}/messages`, 300)).sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
          messages = msgs.map((m) => ({ id: m.id, senderUid: m.senderUid, type: m.type, text: m.text || null, image: typeof m.image === "string" && m.image.length < 400_000 ? m.image : null, amount: m.amount ?? null, signature: m.signature ?? null, createdAt: m.createdAt }));
          await audit({ type: "admin_dispute_review", chatId, n, by: admin.email, count: messages.length });
        }
        return json({ dispute: d ? { ...d, evidence: d.evidence || [] } : per?.dispute ? { reason: per.dispute.reason, by: (per.dispute as any).by || "project", openedAt: per.dispute.at, evidence: [], links: [] } : null, messages, chatAccess: allowed ? "granted" : "not_granted" });
      }
      case "chat": {
        // Server-enforced: only within the 5-minute window the project granted.
        const until = plan.offRequest?.accessUntil ? new Date(plan.offRequest.accessUntil).getTime() : 0;
        if (until < Date.now()) throw new HttpError(403, "The project hasn't granted chat access, or the 5-minute window has expired.");
        const msgs = (await listDocs(`shine_chats/${chatId}/messages`, 300)).sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
        await audit({ type: "admin_view_chat", chatId, by: admin.email, count: msgs.length });
        return json({ accessUntil: new Date(until).toISOString(), messages: msgs.map((m) => ({ id: m.id, senderUid: m.senderUid, type: m.type, text: m.text || null, image: m.image ? true : false, amount: m.amount ?? null, signature: m.signature ?? null, createdAt: m.createdAt })) });
      }
      default: throw new HttpError(400, "Unknown action.");
    }
  } catch (e) { return fail(e); }
}
