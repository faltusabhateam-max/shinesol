import { NextRequest } from "next/server";
import { deleteDocPath, getDocData, HttpError, queryOrdered, queryIds, requireAdmin, setFields } from "@/lib/server-admin";
import { LAMPORTS, solUsd, usdToLamports, vaultAddress, vaultBalance } from "@/lib/server-sol";
import { audit } from "@/lib/server-escrow";
import { publicClaim, referralsOf } from "@/lib/server-referral";
import { FEE_WALLET, REF_TIERS } from "@/lib/config";
import { fail, json } from "@/lib/server-route";
export const runtime = "nodejs";
export const maxDuration = 60;

const ID = /^[A-Za-z0-9_-]{6,160}$/;

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req.headers.get("authorization"));
    const b = await req.json().catch(() => ({}));
    const now = new Date();
    switch (b.action) {
      case "list": {
        const claims = await queryOrdered("shine_ref_claims", "requestedAt", "DESCENDING", 300);
        let price: number | null = null, balance: number | null = null, vault = FEE_WALLET;
        try { price = await solUsd(); } catch {}
        try { vault = vaultAddress(); balance = await vaultBalance(); } catch {}
        return json({ claims: claims.map((c: any) => ({ ...publicClaim(c), uid: c.uid, username: c.username, kind: c.kind, at: c.at, payoutError: c.payoutError || null, totalAtRequest: c.totalAtRequest ?? null, paidTo: c.paidTo || null, fundTx: c.fundTx || null })), price, vault, balance });
      }
      case "user": {
        let uid = String(b.uid || "");
        if (!uid && b.username) [uid] = await queryIds("shine_users", "usernameLower", "EQUAL", String(b.username).replace(/^@/, "").toLowerCase());
        if (!uid || !ID.test(uid)) throw new HttpError(404, "User not found.");
        const u = await getDocData(`shine_users/${uid}`);
        const rows = await referralsOf(uid);
        return json({ uid, username: u?.username || "", total: rows.length, qualified: rows.filter((r) => r.qualified).length, referrals: rows });
      }
    }
    const id = String(b.id || "");
    if (!ID.test(id)) throw new HttpError(400, "Invalid claim id.");
    const c = await getDocData(`shine_ref_claims/${id}`);
    if (!c) throw new HttpError(404, "Claim not found.");
    const tier = REF_TIERS.find((t) => t.id === c.tier)!;
    const log = (type: string, extra: any = {}) => audit({ type: `referral_${type}`, claim: id, uid: c.uid, by: admin.uid, admin: admin.email, ...extra });
    switch (b.action) {
      case "review": {
        if (c.status !== "requested") throw new HttpError(409, "Only new requests can be moved to review.");
        await setFields(`shine_ref_claims/${id}`, { status: "review", updatedAt: now, reviewedBy: admin.email });
        await log("review"); return json({ ok: true });
      }
      case "reject": {
        if (c.status === "paid") throw new HttpError(409, "This reward was already paid.");
        const reason = String(b.reason || "").trim().slice(0, 300);
        if (!reason) throw new HttpError(400, "Enter a rejection reason.");
        await setFields(`shine_ref_claims/${id}`, { status: "rejected", reason, updatedAt: now, reviewedBy: admin.email });
        await log("reject", { reason }); return json({ ok: true });
      }
      case "grant_badge": {
        if (tier.kind !== "badge") throw new HttpError(400, "This tier is not a badge reward.");
        if (!["requested", "review"].includes(c.status)) throw new HttpError(409, "This request is not pending.");
        const f = (await getDocData("shine_meta/flags")) || {};
        const verified = new Set<string>(f.verified || []); verified.add(c.uid);
        const until = { ...(f.verifiedUntil || {}) }; delete until[c.uid];
        await setFields("shine_meta/flags", { verified: [...verified], verifiedUntil: until, updatedAt: now });
        await setFields(`shine_ref_claims/${id}`, { status: "paid", grantedAt: now, updatedAt: now, reviewedBy: admin.email });
        await log("badge"); return json({ ok: true });
      }
      case "mark_funded": {
        if (tier.kind !== "usd") throw new HttpError(400, "Badge rewards don't need funding.");
        if (!["requested", "review"].includes(c.status)) throw new HttpError(409, "Move the request to review first.");
        const price = await solUsd();
        const lamports = usdToLamports(tier.usd, price);
        const fundTx = typeof b.fundTx === "string" && /^[1-9A-HJ-NP-Za-km-z]{60,100}$/.test(b.fundTx) ? b.fundTx : null;
        await setFields(`shine_ref_claims/${id}`, { status: "review", funded: true, lamports, price, fundTx, fundedAt: now, updatedAt: now, reviewedBy: admin.email });
        await log("funded", { lamports, price }); return json({ ok: true, lamports, sol: lamports / LAMPORTS, price });
      }
      case "open_claim": {
        if (tier.kind !== "usd") throw new HttpError(400, "Badge rewards are granted directly.");
        if (!c.funded || !(c.lamports > 0)) throw new HttpError(409, "Mark the reward as funded first.");
        if (c.status !== "review") throw new HttpError(409, "Only reviewed, funded requests can be opened.");
        await setFields(`shine_ref_claims/${id}`, { status: "approved", openedAt: now, updatedAt: now, reviewedBy: admin.email });
        await log("open"); return json({ ok: true });
      }
      case "unlock_payout": {
        // Only after checking Solscan that a failed payout did NOT land.
        if (c.status === "paid") throw new HttpError(409, "Already paid.");
        await deleteDocPath(`shine_ref_payouts/${id}`);
        await setFields(`shine_ref_claims/${id}`, { payoutError: null, updatedAt: now });
        await log("unlock"); return json({ ok: true });
      }
      default: throw new HttpError(400, "Unknown action.");
    }
  } catch (e) { return fail(e); }
}
