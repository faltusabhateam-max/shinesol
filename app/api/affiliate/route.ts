import { NextRequest } from "next/server";
import { Keypair } from "@solana/web3.js";
import { createOnce, getDocData, HttpError, queryIds, requireUser, setFields } from "@/lib/server-admin";
import { findByReference, solUsd, treasuryAddress, usdToLamports, verifyTransfer, LAMPORTS } from "@/lib/server-sol";
import { addLedger } from "@/lib/server-ledger";
import { audit } from "@/lib/server-escrow";
import { AFFILIATE_MAX, AFFILIATE_USD } from "@/lib/config";
import { fail, json } from "@/lib/server-route";
export const runtime = "nodejs";
export const maxDuration = 60;

const verifiedNow = (flags: any, uid: string) => (flags.verified || []).includes(uid) || (flags.verifiedUntil?.[uid] && new Date(flags.verifiedUntil[uid]).getTime() > Date.now());
async function writeAffiliates(mut: (a: Record<string, any>) => void) {
  const f = (await getDocData("shine_meta/flags")) || {};
  const a = { ...(f.affiliates || {}) };
  mut(a);
  await setFields("shine_meta/flags", { affiliates: a });
}

export async function POST(req: NextRequest) {
  try {
    const { uid } = await requireUser(req.headers.get("authorization"));
    const b = await req.json().catch(() => ({}));
    const [me, flags, aff] = await Promise.all([getDocData(`shine_users/${uid}`), getDocData("shine_meta/flags"), getDocData(`shine_affiliates/${uid}`)]);
    if (!me || me.role !== "project") throw new HttpError(403, "Affiliate distribution is available to project accounts.");
    const f = flags || {};
    const verified = verifiedNow(f, uid);
    const until = f.verifiedUntil?.[uid] || null;

    switch (b.action) {
      case "status": return json({ enabled: !!aff?.enabled, members: aff?.members || [], verified, until, max: AFFILIATE_MAX, paidTx: aff?.paidTx || null });
      case "intent": {
        if (!verified) throw new HttpError(403, "Get Shine Verified first — affiliate distribution requires an active Verified plan.");
        if (aff?.enabled) throw new HttpError(409, "Affiliate distribution is already unlocked.");
        const price = await solUsd();
        const lamports = usdToLamports(AFFILIATE_USD, price);
        const reference = Keypair.generate().publicKey.toBase58();
        const recipient = treasuryAddress();
        await createOnce("shine_verify_intents", reference, { uid, plan: "affiliate", lamports, usd: AFFILIATE_USD, price, recipient, status: "pending", createdAt: new Date(), expiresAt: new Date(Date.now() + 30 * 60_000) });
        const sol = (lamports / LAMPORTS).toFixed(9).replace(/0+$/, "").replace(/\.$/, "");
        return json({ reference, lamports, sol: lamports / LAMPORTS, usd: AFFILIATE_USD, price, recipient, url: `solana:${recipient}?amount=${sol}&reference=${reference}&label=Shine&message=${encodeURIComponent("Shine affiliate distribution")}` });
      }
      case "check": {
        const ref = String(b.reference || "");
        const intent = await getDocData(`shine_verify_intents/${ref}`);
        if (!intent || intent.uid !== uid || intent.plan !== "affiliate") throw new HttpError(404, "Payment request not found.");
        if (intent.status === "paid") return json({ paid: true });
        const sig = (typeof b.signature === "string" && b.signature) || (await findByReference(ref));
        if (!sig) return json({ paid: false });
        const v = await verifyTransfer(sig, { to: intent.recipient, minLamports: Math.floor(intent.lamports * 0.995), reference: ref });
        if (!(await createOnce("shine_escrow_tx", sig, { kind: "affiliate", uid, reference: ref, lamports: v.lamports, at: new Date() }))) throw new HttpError(409, "This transaction was already used.");
        await setFields(`shine_affiliates/${uid}`, { projectUid: uid, projectUsername: me.username, projectName: me.project?.name || me.username, enabled: true, paidTx: sig, members: aff?.members || [], enabledAt: new Date(), updatedAt: new Date() });
        await setFields(`shine_verify_intents/${ref}`, { status: "paid", signature: sig, paidAt: new Date() });
        await addLedger({ type: "affiliate", source: "affiliate", lamports: v.lamports, signature: sig, label: `Affiliate distribution · ${me.project?.name || me.username}`, uid });
        await audit({ type: "affiliate_paid", uid, sig });
        return json({ paid: true, signature: sig });
      }
      case "add": {
        if (!aff?.enabled) throw new HttpError(403, "Unlock affiliate distribution first.");
        if (!verified) throw new HttpError(403, "Your Verified plan has expired. Renew it to grant affiliate badges.");
        const members: any[] = aff.members || [];
        if (members.length >= AFFILIATE_MAX) throw new HttpError(409, `You can grant up to ${AFFILIATE_MAX} affiliate badges.`);
        const name = String(b.username || "").trim().replace(/^@/, "").toLowerCase();
        if (!/^[a-z0-9_]{1,15}$/.test(name)) throw new HttpError(400, "Enter a valid Shine username.");
        const [tid] = await queryIds("shine_users", "usernameLower", "EQUAL", name);
        if (!tid) throw new HttpError(404, `No Shine account @${name}.`);
        if (tid === uid) throw new HttpError(400, "You can't add yourself.");
        if (members.some((m) => m.uid === tid)) throw new HttpError(409, "Already an affiliate.");
        const target = await getDocData(`shine_users/${tid}`);
        const existing = f.affiliates?.[tid];
        if (existing && existing.p !== uid && verifiedNow(f, existing.p)) throw new HttpError(409, `@${target.username} is already affiliated with another project.`);
        const next = [...members, { uid: tid, username: target.username, addedAt: new Date() }];
        await setFields(`shine_affiliates/${uid}`, { members: next, updatedAt: new Date() });
        await writeAffiliates((a) => { a[tid] = { p: uid, u: me.username }; });
        return json({ ok: true, members: next });
      }
      case "remove": {
        const members: any[] = (aff?.members || []).filter((m: any) => m.uid !== b.uid);
        await setFields(`shine_affiliates/${uid}`, { members: members.map((m) => ({ ...m, addedAt: new Date(m.addedAt) })), updatedAt: new Date() });
        await writeAffiliates((a) => { if (a[b.uid]?.p === uid) delete a[b.uid]; });
        return json({ ok: true, members });
      }
      default: throw new HttpError(400, "Unknown action.");
    }
  } catch (e) { return fail(e); }
}
