import { NextRequest } from "next/server";
import { createOnce, getDocData, HttpError, privySolWallets, queryDocs, queryIds, requireUser, setFields } from "@/lib/server-admin";
import { conn, LAMPORTS, sendFromVault, vault } from "@/lib/server-sol";
import { audit } from "@/lib/server-escrow";
import { claimId, dayKey, referralsOf, tierStates } from "@/lib/server-referral";
import { REF_ACTIVE_DAYS, REF_ATTACH_HOURS, REF_TIERS, REF_WINDOW_DAYS } from "@/lib/config";
import { fail, json } from "@/lib/server-route";
export const runtime = "nodejs";
export const maxDuration = 60;

const NAME = /^[A-Za-z0-9_]{1,15}$/;

async function myClaims(uid: string) {
  const list = await queryDocs("shine_ref_claims", [["uid", "EQUAL", uid]], 20);
  return Object.fromEntries(list.map((c: any) => [c.tier, c]));
}

export async function POST(req: NextRequest) {
  try {
    const { did, uid } = await requireUser(req.headers.get("authorization"));
    const b = await req.json().catch(() => ({}));
    switch (b.action) {
      /** Lightweight daily-activity ping (on app load) + one-time ref attach. */
      case "ping": {
        const today = dayKey();
        const act = (await getDocData(`shine_activity/${uid}`)) || {};
        const days: string[] = act.days || [];
        if (!days.includes(today)) await setFields(`shine_activity/${uid}`, { uid, days: [today, ...days].slice(0, 60), lastAt: new Date() });
        let attached: string | null = null;
        const ref = String(b.ref || "").trim().replace(/^@/, "");
        if (ref && NAME.test(ref)) {
          const [me, existing] = await Promise.all([getDocData(`shine_users/${uid}`), getDocData(`shine_referrals/${uid}`)]);
          const created = me?.createdAt ? new Date(me.createdAt).getTime() : 0;
          if (me && !existing && created && Date.now() - created < REF_ATTACH_HOURS * 3600_000) {
            const [rid] = await queryIds("shine_users", "usernameLower", "EQUAL", ref.toLowerCase());
            if (rid && rid !== uid) {
              const ru = await getDocData(`shine_users/${rid}`);
              // createOnce: referredBy is stored once and can never change.
              if (await createOnce("shine_referrals", uid, { uid, username: me.username, referredBy: rid, referredByUsername: ru?.username || ref, attachedAt: new Date() })) attached = ru?.username || ref;
            }
          }
        }
        return json({ ok: true, attached });
      }
      case "status": {
        const [me, flags, mine] = await Promise.all([getDocData(`shine_users/${uid}`), getDocData("shine_meta/flags"), getDocData(`shine_referrals/${uid}`)]);
        if (!me) throw new HttpError(404, "Create your Shine profile first.");
        const rows = await referralsOf(uid, flags);
        const qualified = rows.filter((r) => r.qualified).length;
        const tiers = tierStates(qualified, await myClaims(uid));
        return json({
          username: me.username, total: rows.length, qualified, tiers, referredBy: mine?.referredByUsername || null,
          rules: { activeDays: REF_ACTIVE_DAYS, windowDays: REF_WINDOW_DAYS },
          referrals: rows.slice(0, 200).map((r) => ({ username: r.username, attachedAt: r.attachedAt, verified: r.verified, active: r.active, activeDays: r.activeDays, qualified: r.qualified })),
        });
      }
      case "request": {
        const tier = REF_TIERS.find((t) => t.id === b.tier);
        if (!tier) throw new HttpError(400, "Unknown reward tier.");
        const [me, flags] = await Promise.all([getDocData(`shine_users/${uid}`), getDocData("shine_meta/flags")]);
        if (!me) throw new HttpError(404, "Create your Shine profile first.");
        if ((flags?.deactivated || []).includes(uid)) throw new HttpError(403, "Your account is deactivated.");
        const rows = await referralsOf(uid, flags);
        const qualified = rows.filter((r) => r.qualified).length;
        if (qualified < tier.at) throw new HttpError(403, `You need ${tier.at} qualified referrals for this reward (you have ${qualified}).`);
        const id = claimId(uid, tier.id);
        const existing = await getDocData(`shine_ref_claims/${id}`);
        if (existing && existing.status !== "rejected") throw new HttpError(409, "You already requested this reward.");
        await setFields(`shine_ref_claims/${id}`, { uid, username: me.username, tier: tier.id, kind: tier.kind, at: tier.at, usd: tier.usd, status: "requested", reason: null, funded: false, lamports: 0, qualifiedAtRequest: qualified, totalAtRequest: rows.length, requestedAt: new Date(), updatedAt: new Date() });
        await audit({ type: "referral_request", uid, tier: tier.id });
        return json({ ok: true });
      }
      /** Pays an approved (open) dollar-tier claim from the vault to the caller's Shine wallet. */
      case "claim": {
        const tier = REF_TIERS.find((t) => t.id === b.tier && t.kind === "usd");
        if (!tier) throw new HttpError(400, "Unknown reward tier.");
        const id = claimId(uid, tier.id);
        const c = await getDocData(`shine_ref_claims/${id}`);
        if (!c || c.uid !== uid) throw new HttpError(404, "Claim not found.");
        if (c.status === "paid") return json({ ok: true, tx: c.tx });
        if (c.status !== "approved" || !c.funded || !(c.lamports > 0)) throw new HttpError(409, "This claim isn't open yet. The team will open it after review.");
        const [to] = await privySolWallets(did);
        if (!to) throw new HttpError(409, "Your Shine wallet isn't ready yet.");
        const bal = await conn().getBalance(vault().publicKey, "confirmed");
        if (bal < c.lamports + 10_000) throw new HttpError(503, "The reward vault is being topped up. Please try again later.");
        // Payout lock: exactly one payout per claim, ever.
        if (!(await createOnce("shine_ref_payouts", id, { uid, tier: tier.id, lamports: c.lamports, to, at: new Date() }))) throw new HttpError(409, "This reward is already being paid.");
        let sig = "";
        try { sig = await sendFromVault(to, c.lamports); }
        catch (e: any) {
          await setFields(`shine_ref_claims/${id}`, { payoutError: String(e?.message || "send failed").slice(0, 300), updatedAt: new Date() });
          await audit({ type: "referral_payout_error", uid, tier: tier.id, err: String(e?.message || "") });
          throw new HttpError(502, "The payout could not be completed. Our team has been notified.");
        }
        await createOnce("shine_escrow_tx", sig, { kind: "referral_reward", uid, lamports: c.lamports, at: new Date() });
        await setFields(`shine_ref_claims/${id}`, { status: "paid", tx: sig, paidTo: to, paidAt: new Date(), updatedAt: new Date(), payoutError: null });
        await audit({ type: "referral_paid", uid, tier: tier.id, sig, sol: c.lamports / LAMPORTS });
        return json({ ok: true, tx: sig });
      }
      default: throw new HttpError(400, "Unknown action.");
    }
  } catch (e) { return fail(e); }
}
