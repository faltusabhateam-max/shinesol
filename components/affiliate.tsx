"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useFlags, VerifiedBadge } from "./flags";
import { Button, Card } from "./ui";
import { useToast } from "./toast";
import { StatusOverlay, errorKind, friendlyError, type StatusKind } from "./status";
import { ExternalPay, ExternalWalletProvider } from "./external-wallet";
import { useApi, useShineWallet } from "@/lib/client-api";
import { AFFILIATE_MAX, AFFILIATE_USD } from "@/lib/config";
import { fmtSol, fmtUsd, short } from "@/lib/format";

/** Next to "Edit profile": Get Verified, or the active verification status with expiry. */
export function VerifyPill({ uid }: { uid: string }) {
  const { isVerified, official, paidUntil } = useFlags();
  const v = isVerified(uid);
  const until = paidUntil[uid];
  const cls = "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold ring-1";
  if (!v) return <Link href="/verify"><motion.span whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.95 }} className={`${cls} bg-pink text-white ring-pink shadow-[0_0_20px_-6px_#ff2fa6]`}><VerifiedBadge force size={15} />Get Verified</motion.span></Link>;
  return (
    <Link href="/verify"><span className={`${cls} bg-pink/10 text-pink ring-pink/40`}><VerifiedBadge force size={15} />
      {official.has(uid) && !until ? "Verified by Shine" : <>You&apos;re verified{until && <span className="font-normal text-white/60"> · until {until.toLocaleDateString(undefined, { dateStyle: "medium" })}</span>}</>}
    </span></Link>
  );
}

type Status = { enabled: boolean; members: { uid: string; username: string }[]; verified: boolean; until: string | null; max: number };
type Intent = { reference: string; lamports: number; sol: number; usd: number; price: number; recipient: string; url: string };

/** Project-only: unlock affiliate distribution ($5 SOL) and grant/remove affiliate badges. */
export function AffiliateManager({ uid }: { uid: string }) {
  const api = useApi();
  const { pay } = useShineWallet();
  const toast = useToast();
  const [st, setSt] = useState<Status | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [intent, setIntent] = useState<Intent | null>(null);
  const [status, setStatus] = useState<{ kind: StatusKind; title: string; msg: string } | null>(null);
  const poll = useRef<any>(null);
  const load = useCallback(() => api<Status>("/api/affiliate", { action: "status" }).then(setSt).catch(() => {}), [api]);
  useEffect(() => { load(); return () => clearInterval(poll.current); }, [load, uid]);

  const check = async (reference: string, signature?: string) => {
    const r = await api<{ paid: boolean }>("/api/affiliate", { action: "check", reference, signature });
    if (r.paid) { clearInterval(poll.current); setIntent(null); setStatus({ kind: "success", title: "Affiliate distribution unlocked", msg: `You can now grant your affiliate badge to up to ${AFFILIATE_MAX} Shine users.` }); load(); }
    return r.paid;
  };
  const unlock = async (m: "shine" | "external") => {
    setBusy(true);
    try {
      const it = intent || (await api<Intent>("/api/affiliate", { action: "intent" }));
      setIntent(it);
      if (m === "shine") {
        const sig = await pay(it.recipient, it.lamports, { title: "Unlock affiliate distribution", subtitle: `Grant your badge to up to ${AFFILIATE_MAX} users`, amount: `${fmtSol(it.sol, 4)} SOL`, amountSub: `≈ ${fmtUsd(it.usd)} at $${it.price.toFixed(2)}/SOL`, rows: [["To", `Shine vault · ${short(it.recipient, 4)}`]], confirmLabel: "Confirm & pay" }, it.reference);
        let ok = false;
        for (let i = 0; i < 6 && !ok; i++) { ok = await check(it.reference, sig).catch(() => false); if (!ok) await new Promise((r) => setTimeout(r, 2500)); }
      } else {
        clearInterval(poll.current);
        poll.current = setInterval(() => check(it.reference).catch(() => {}), 4000);
      }
    } catch (e) { const k = errorKind(e); setStatus({ kind: k, title: k === "denied" ? "Payment cancelled" : "Couldn't unlock", msg: friendlyError(e) }); }
    setBusy(false);
  };
  const add = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try { const r = await api<{ members: Status["members"] }>("/api/affiliate", { action: "add", username: name }); setSt((s) => s && { ...s, members: r.members }); setName(""); toast("Affiliate badge granted", "ok"); }
    catch (e) { toast(friendlyError(e), "err"); }
    setBusy(false);
  };
  const remove = async (m: string) => {
    try { const r = await api<{ members: Status["members"] }>("/api/affiliate", { action: "remove", uid: m }); setSt((s) => s && { ...s, members: r.members }); toast("Affiliate removed", "ok"); }
    catch (e) { toast(friendlyError(e), "err"); }
  };
  if (!st) return null;
  return (
    <Card className="mt-6 p-5">
      <div className="mb-1 flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold">Affiliates</h2>
        {st.enabled && <span className="text-xs text-white/50">{st.members.length}/{st.max}</span>}
      </div>
      {!st.enabled ? (
        <>
          <p className="text-sm text-white/60">Give your community members your project avatar as a badge next to their name — linked to your profile. Up to {AFFILIATE_MAX} users, active while your Verified plan lasts. One-time {fmtUsd(AFFILIATE_USD)} in SOL.</p>
          {!st.verified ? <Link href="/verify" className="mt-4 block"><Button className="w-full">Get Verified to unlock</Button></Link> : (
            <ExternalWalletProvider>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <Button loading={busy} onClick={() => unlock("shine")}>Pay {fmtUsd(AFFILIATE_USD)} with Shine Wallet</Button>
                <Button variant="glass" disabled={busy} onClick={() => unlock("external")}>Pay with external wallet</Button>
              </div>
              {intent && <div className="mt-3"><ExternalPay recipient={intent.recipient} lamports={intent.lamports} reference={intent.reference} label={`Pay ${fmtSol(intent.sol, 4)} SOL`} onSent={(sig) => setTimeout(() => check(intent.reference, sig).catch(() => {}), 2500)} /></div>}
            </ExternalWalletProvider>
          )}
        </>
      ) : (
        <>
          {!st.verified && <p className="mb-3 rounded-xl bg-amber-400/10 p-3 text-sm text-amber-200 ring-1 ring-amber-400/30">Your Verified plan has expired — affiliate badges are hidden until you renew.</p>}
          <div className="flex gap-2">
            <input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} placeholder="Add by Shine username" maxLength={16}
              className="min-w-0 flex-1 rounded-xl bg-white/[.04] px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-pink/50" />
            <Button size="sm" loading={busy} disabled={st.members.length >= st.max || !st.verified} onClick={add}>Add</Button>
          </div>
          <ul className="mt-3 grid gap-1.5">
            <AnimatePresence initial={false}>
              {st.members.map((m) => (
                <motion.li key={m.uid} layout initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="flex items-center justify-between rounded-xl bg-white/[.03] px-3 py-2 text-sm ring-1 ring-white/5">
                  <Link href={`/u/${m.username}`} className="flex items-center gap-1.5 min-w-0 hover:text-pink"><span className="truncate">@{m.username}</span><VerifiedBadge uid={m.uid} size={14} /></Link>
                  <button type="button" onClick={() => remove(m.uid)} className="text-xs text-white/50 hover:text-red-300">Remove</button>
                </motion.li>
              ))}
            </AnimatePresence>
            {!st.members.length && <li className="text-sm text-white/40">No affiliates yet.</li>}
          </ul>
        </>
      )}
      <StatusOverlay kind={status?.kind ?? null} title={status?.title} message={status?.msg} onClose={() => setStatus(null)} />
    </Card>
  );
}
