import "server-only";
import { getDocData, queryDocs } from "./server-admin";
import { REF_ACTIVE_DAYS, REF_TIERS, REF_WINDOW_DAYS, type RefStatus } from "./config";

export const dayKey = (d = new Date()) => d.toISOString().slice(0, 10);
export function windowDays() {
  const out: string[] = [];
  for (let i = 0; i < REF_WINDOW_DAYS; i++) out.push(dayKey(new Date(Date.now() - i * 86400_000)));
  return out;
}
export const activeCount = (days: string[] = []) => { const w = new Set(windowDays()); return days.filter((d) => w.has(d)).length; };
const verifiedNow = (f: any, uid: string) => (f.verified || []).includes(uid) || (f.verifiedUntil?.[uid] && new Date(f.verifiedUntil[uid]).getTime() > Date.now());

async function inChunks<T, R>(xs: T[], n: number, fn: (x: T) => Promise<R>) {
  const out: R[] = [];
  for (let i = 0; i < xs.length; i += n) out.push(...(await Promise.all(xs.slice(i, i + n).map(fn))));
  return out;
}

export type RefRow = { uid: string; username: string; attachedAt: string; verified: boolean; activeDays: number; active: boolean; qualified: boolean; deactivated: boolean };

/** Full referral list for a referrer, with qualified flags computed server-side. */
export async function referralsOf(uid: string, flags?: any): Promise<RefRow[]> {
  const f = flags || (await getDocData("shine_meta/flags")) || {};
  const deact = new Set<string>(f.deactivated || []);
  const refs = await queryDocs("shine_referrals", [["referredBy", "EQUAL", uid]], 5000);
  const rows = await inChunks(refs, 40, async (r: any) => {
    const act = await getDocData(`shine_activity/${r.id}`).catch(() => null);
    const activeDays = activeCount(act?.days || []);
    const verified = !!verifiedNow(f, r.id);
    const active = activeDays >= REF_ACTIVE_DAYS;
    const deactivated = deact.has(r.id);
    return { uid: r.id, username: r.username || "", attachedAt: r.attachedAt || "", verified, activeDays, active, deactivated, qualified: verified && active && !deactivated && !r.disqualified };
  });
  return rows.sort((a, b) => (b.attachedAt || "").localeCompare(a.attachedAt || ""));
}

export const claimId = (uid: string, tier: string) => `${uid}_${tier}`;

/** Effective status of each tier for a user. */
export function tierStates(qualified: number, claims: Record<string, any>) {
  return REF_TIERS.map((t) => {
    const c = claims[t.id];
    let status: RefStatus = qualified >= t.at ? "eligible" : "locked";
    if (c?.status) status = c.status;
    return { ...t, status, claim: c ? publicClaim(c) : null };
  });
}
export const publicClaim = (c: any) => ({
  id: c.id, tier: c.tier, status: c.status as RefStatus, reason: c.reason || null, usd: c.usd || 0, lamports: c.lamports || 0, price: c.price || null,
  funded: !!c.funded, tx: c.tx || null, requestedAt: c.requestedAt || null, updatedAt: c.updatedAt || null, qualifiedAtRequest: c.qualifiedAtRequest ?? null,
});
