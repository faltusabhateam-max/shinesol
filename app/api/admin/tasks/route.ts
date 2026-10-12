import { NextRequest } from "next/server";
import { HttpError, queryDocs, queryOrdered, requireAdmin, setFields } from "@/lib/server-admin";
import { audit } from "@/lib/server-escrow";
import { fail, json } from "@/lib/server-route";
import { freeSlot, loadClaim, loadTask, payClaim, recount, refundRemaining } from "@/lib/server-tasks";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req.headers.get("authorization"));
    const b = await req.json().catch(() => ({}));
    if (b.action === "list") {
      const [queue, tasks] = await Promise.all([queryDocs("shine_task_claims", [["status", "EQUAL", "submitted"]], 300), queryOrdered("shine_tasks", "createdAt", "DESCENDING", 200)]);
      queue.sort((a: any, c: any) => new Date(a.submittedAt).getTime() - new Date(c.submittedAt).getTime());
      return json({ queue, tasks: tasks.filter((t: any) => t.status !== "funding") });
    }
    const c = b.claimId ? await loadClaim(String(b.claimId)) : null;
    const t = await loadTask(String(b.taskId || c?.taskId || ""));
    if (!t) throw new HttpError(404, "Campaign not found.");
    switch (b.action) {
      case "approve": {
        if (!c) throw new HttpError(404, "Claim not found.");
        const sig = await payClaim(t, c, admin.email || admin.uid);
        await audit({ type: "task_approve", claimId: c.id, by: admin.email, sig });
        return json({ ok: true, signature: sig });
      }
      case "reject": {
        if (!c || !["submitted", "changes", "reserved"].includes(c.status)) throw new HttpError(409, "This claim can't be rejected.");
        await setFields(`shine_task_claims/${c.id}`, { status: "rejected", note: String(b.note || "").slice(0, 300), notice: "Your submission was rejected by the Shine team.", reviewedAt: new Date(), reviewedBy: admin.email });
        await freeSlot(t.id, (c as any).slot);
        await recount(t.id);
        await audit({ type: "task_reject", claimId: c.id, by: admin.email });
        return json({ ok: true });
      }
      case "changes": {
        if (!c || c.status !== "submitted") throw new HttpError(409, "Only submitted claims can be sent back.");
        const note = String(b.note || "").trim().slice(0, 300);
        if (note.length < 5) throw new HttpError(400, "Tell the user what's missing.");
        await setFields(`shine_task_claims/${c.id}`, { status: "changes", note, notice: `The Shine team asked you to complete: ${note}`, reviewedAt: new Date(), reviewedBy: admin.email });
        await recount(t.id);
        await audit({ type: "task_changes", claimId: c.id, by: admin.email });
        return json({ ok: true });
      }
      case "claims": return json({ claims: await queryDocs("shine_task_claims", [["taskId", "EQUAL", t.id]], 2000) });
      case "refund": {
        const r = await refundRemaining(t, admin.email || admin.uid);
        await audit({ type: "task_refund", taskId: t.id, by: admin.email, sig: r.signature, lamports: r.lamports });
        return json({ ok: true, ...r });
      }
    }
    throw new HttpError(400, "Unknown action.");
  } catch (e) { return fail(e); }
}
