import { NextRequest } from "next/server";
import { Keypair } from "@solana/web3.js";
import { createOnce, getDocData, HttpError, requireUser, setFields } from "@/lib/server-admin";
import { findByReference, solUsd, treasuryAddress, usdToLamports, verifyTransfer, LAMPORTS } from "@/lib/server-sol";
import { audit } from "@/lib/server-escrow";
import { VERIFY_PLANS } from "@/lib/config";
import { fail, json } from "@/lib/server-route";
import { addLedger } from "@/lib/server-ledger";
export const runtime = "nodejs";
export const maxDuration = 60;

const addMonths = (d: Date, m: number) => { const x = new Date(d); x.setMonth(x.getMonth() + m); return x; };

export async function POST(req: NextRequest) {
  try {
    const { uid } = await requireUser(req.headers.get("authorization"));
    const b = await req.json().catch(() => ({}));
    if (b.action === "status") {
      const v = await getDocData(`shine_verify/${uid}`);
      return json({ until: v?.until || null, plan: v?.plan || null });
    }
    if (b.action === "intent") {
      const plan = VERIFY_PLANS.find((p) => p.id === b.plan);
      if (!plan) throw new HttpError(400, "Choose a plan.");
      const price = await solUsd();
      const lamports = usdToLamports(plan.usd, price);
      const reference = Keypair.generate().publicKey.toBase58();
      const recipient = treasuryAddress();
      const expiresAt = new Date(Date.now() + 30 * 60_000);
      await createOnce("shine_verify_intents", reference, { uid, plan: plan.id, lamports, usd: plan.usd, price, recipient, status: "pending", createdAt: new Date(), expiresAt });
      const sol = (lamports / LAMPORTS).toFixed(9).replace(/0+$/, "").replace(/\.$/, "");
      const url = `solana:${recipient}?amount=${sol}&reference=${reference}&label=${encodeURIComponent("Shine")}&message=${encodeURIComponent(`Shine Verified · ${plan.label}`)}`;
      return json({ reference, lamports, sol: lamports / LAMPORTS, usd: plan.usd, price, recipient, url, expiresAt: expiresAt.toISOString() });
    }
    if (b.action === "check") {
      const ref = String(b.reference || "");
      if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(ref)) throw new HttpError(400, "Invalid reference.");
      const intent = await getDocData(`shine_verify_intents/${ref}`);
      if (!intent || intent.uid !== uid) throw new HttpError(404, "Payment request not found.");
      if (intent.status === "paid") return json({ paid: true, until: intent.until });
      const sig = (typeof b.signature === "string" && b.signature) || (await findByReference(ref));
      if (!sig) return json({ paid: false });
      if (new Date(intent.expiresAt).getTime() < Date.now() - 2 * 3600_000) throw new HttpError(410, "This payment request expired. Contact Shine Support if you already paid.");
      const v = await verifyTransfer(sig, { to: intent.recipient, minLamports: Math.floor(intent.lamports * 0.995), reference: ref });
      if (!(await createOnce("shine_escrow_tx", sig, { kind: "verify", uid, reference: ref, lamports: v.lamports, at: new Date() }))) {
        const again = await getDocData(`shine_verify_intents/${ref}`);
        if (again?.status === "paid") return json({ paid: true, until: again.until });
        throw new HttpError(409, "This transaction was already used.");
      }
      if (intent.plan === "affiliate") return json({ paid: false, error: "Use the affiliate endpoint." });
      const plan = VERIFY_PLANS.find((p) => p.id === intent.plan)!;
      await addLedger({ type: "verify", source: "verify", lamports: v.lamports, signature: sig, label: `Shine Verified · ${plan.label}`, uid });
      const cur = await getDocData(`shine_verify/${uid}`);
      const base = cur?.until && new Date(cur.until).getTime() > Date.now() ? new Date(cur.until) : new Date();
      const until = addMonths(base, plan.months);
      await setFields(`shine_verify/${uid}`, { uid, until, plan: plan.id, lastTx: sig, updatedAt: new Date() });
      const flags = (await getDocData("shine_meta/flags")) || {};
      const vu = Object.fromEntries(Object.entries(flags.verifiedUntil || {}).map(([k, t]) => [k, new Date(t as string)]));
      vu[uid] = until;
      await setFields("shine_meta/flags", { verifiedUntil: vu });
      await setFields(`shine_verify_intents/${ref}`, { status: "paid", signature: sig, until, paidAt: new Date() });
      await audit({ type: "verify_paid", uid, plan: plan.id, sig, lamports: v.lamports });
      return json({ paid: true, until: until.toISOString(), signature: sig });
    }
    throw new HttpError(400, "Unknown action.");
  } catch (e) { return fail(e); }
}
