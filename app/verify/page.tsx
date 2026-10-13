"use client";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { VERIFY_PLANS, VERIFY_TREASURY, type VerifyPlanId } from "@/lib/config";
import { useSession } from "@/components/providers";
import { useFlags, VerifiedBadge } from "@/components/flags";
import { BackLink, Button } from "@/components/ui";
import { BottomSheet } from "@/components/bottom-sheet";
import { StatusOverlay, errorKind, friendlyError } from "@/components/status";
import { ExternalPay, ExternalWalletProvider } from "@/components/external-wallet";
import { useApi, useShineWallet } from "@/lib/client-api";
import { usePrice } from "@/lib/use-price";
import { fmtSol, fmtUsd, short } from "@/lib/format";
import { solscanTx } from "@/lib/solana";
import { useToast } from "@/components/toast";

const DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === "1";
const P = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
const BENEFITS = [
  { t: "Verified badge everywhere", d: "Pink seal on your profile, posts, replies, chats and search results.", i: <svg {...P}><path d="M12 2.5 14.5 4l3-.2.9 2.9 2.5 1.8-1 2.9 1 3-2.5 1.8-.9 2.9-3-.2L12 21.5 9.5 20l-3 .2-.9-2.9L3.1 15.5l1-3-1-2.9 2.5-1.8.9-2.9 3 .2z" /><path d="m8.5 12 2.4 2.4 4.6-4.8" /></svg> },
  { t: "Boosted visibility", d: "Ranked higher in the Home feed and Events search.", i: <svg {...P}><path d="M3 17l6-6 4 4 8-8M15 7h6v6" /></svg> },
  { t: "DM projects directly", d: "Message any project without applying or being hired first.", i: <svg {...P}><path d="M4 12a8 8 0 1 1 3.3 6.5L4 20l1-3.6A8 8 0 0 1 4 12z" /><path d="M9 12h6M12 9v6" /></svg> },
  { t: "Highlighted applications", d: "Your applications are pinned to the top of a project's Review.", i: <svg {...P}><rect x="4" y="4" width="16" height="16" rx="3" /><path d="m8 12 3 3 5-6" /></svg> },
  { t: "Higher ranking to projects", d: "Projects see verified creators first when browsing talent.", i: <svg {...P}><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z" /><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3" /></svg> },
  { t: "Priority support", d: "Your Shine Support messages jump the queue.", i: <svg {...P}><path d="M4 12a8 8 0 0 1 16 0v4a2 2 0 0 1-2 2h-2v-6h4M4 12v4a2 2 0 0 0 2 2h2v-6H4" /></svg> },
  { t: "Early access", d: "Be first to new opportunities and Shine features.", i: <svg {...P}><path d="M13 3 4 14h7l-1 7 9-11h-7z" /></svg> },
  { t: "Profile analytics", d: "See profile views and how projects find you.", i: <svg {...P}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></svg> },
  { t: "Highlighted share card", d: "A premium profile link and share card with your verified seal.", i: <svg {...P}><rect x="3" y="5" width="18" height="14" rx="3" /><circle cx="9" cy="12" r="2.5" /><path d="M14 10h4M14 14h3" /></svg> },
  { t: "Trust & safety", d: "Projects trust verified creators more — fewer scams, faster hires.", i: <svg {...P}><path d="M12 3 4 6v6c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V6z" /></svg> },
];
type Intent = { reference: string; lamports: number; sol: number; usd: number; price: number; recipient: string; url: string };

export default function VerifyPage() {
  const { authenticated, login, uid } = useSession();
  const { isVerified, paidUntil } = useFlags();
  const { usd: price } = usePrice();
  const api = useApi();
  const { pay } = useShineWallet();
  const toast = useToast();
  const [plan, setPlan] = useState<VerifyPlanId>("6m");
  const [method, setMethod] = useState<"shine" | "external" | null>(null);
  const [intent, setIntent] = useState<Intent | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ kind: "success" | "failed" | "denied"; title: string; msg?: React.ReactNode } | null>(null);
  const poll = useRef<ReturnType<typeof setInterval> | null>(null);
  const v = uid ? isVerified(uid) : false;
  const until = uid ? paidUntil[uid] : undefined;
  const sel = VERIFY_PLANS.find((p) => p.id === plan)!;
  useEffect(() => () => { if (poll.current) clearInterval(poll.current); }, []);
  useEffect(() => {
    if (!DEMO) return;
    const m = new URLSearchParams(location.search).get("pay");
    if (m === "external") { setMethod("external"); setIntent({ reference: "8vS4tX1m2Y9TQd3bF7nKpQe6WcRhL5uZaJ2sGxV9NnBo", lamports: 166_000_000, sol: 0.166, usd: 30, price: 180.5, recipient: VERIFY_TREASURY, url: `solana:${VERIFY_TREASURY}?amount=0.166&reference=8vS4tX1m2Y9TQd3bF7nKpQe6WcRhL5uZaJ2sGxV9NnBo&label=Shine&message=Shine%20Verified` }); }
  }, []);

  const granted = (until: string, sig?: string) => {
    if (poll.current) clearInterval(poll.current);
    setMethod(null); setIntent(null);
    setStatus({ kind: "success", title: "You're Shine Verified", msg: <>Your badge is active until {new Date(until).toLocaleDateString(undefined, { dateStyle: "medium" })}.{sig && <> <a className="text-pink underline" href={solscanTx(sig)} target="_blank" rel="noopener noreferrer">View payment</a></>}</> });
  };
  const check = async (reference: string, signature?: string) => {
    const r = await api<{ paid: boolean; until?: string; signature?: string }>("/api/verify", { action: "check", reference, signature });
    if (r.paid && r.until) granted(r.until, r.signature || signature);
    return r.paid;
  };
  const start = async (m: "shine" | "external") => {
    if (!authenticated) return login();
    setBusy(true);
    try {
      const it = await api<Intent>("/api/verify", { action: "intent", plan });
      setIntent(it);
      if (m === "shine") {
        const sig = await pay(it.recipient, it.lamports, {
          title: "Get Shine Verified", subtitle: `${sel.label} of Shine Verified`, amount: `${fmtSol(it.sol, 4)} SOL`, amountSub: `≈ ${fmtUsd(it.usd)} at $${it.price.toFixed(2)}/SOL`,
          rows: [["Plan", sel.label], ["To", <span key="t" className="font-mono">Shine · {short(it.recipient, 4)}</span>]], confirmLabel: "Confirm & pay",
        }, it.reference);
        let ok = false;
        for (let i = 0; i < 6 && !ok; i++) { ok = await check(it.reference, sig).catch(() => false); if (!ok) await new Promise((r) => setTimeout(r, 2500)); }
        if (!ok) setStatus({ kind: "failed", title: "Payment received — confirming", msg: "We're still confirming your payment on Solana. Your badge will appear shortly; contact Shine Support if it doesn't." });
      } else {
        setMethod("external");
        if (poll.current) clearInterval(poll.current);
        poll.current = setInterval(() => { check(it.reference).catch(() => {}); }, 4000);
      }
    } catch (e) { const k = errorKind(e); setStatus({ kind: k, title: k === "denied" ? "Payment cancelled" : "Payment failed", msg: friendlyError(e) }); }
    setBusy(false);
  };

  return (
    <div className="mx-auto max-w-2xl">
      <BackLink href="/settings" label="Settings" />
      <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass relative mb-5 overflow-hidden rounded-[2rem] p-6 text-center">
        <motion.div className="relative mx-auto mb-3 w-fit"><VerifiedBadge force size={72} /></motion.div>
        <h1 className="relative font-display text-3xl font-bold tracking-tight sm:text-4xl">Shine Verified</h1>
        <p className="relative mx-auto mt-2 max-w-md text-white/65">Stand out to projects, message them directly and get seen first — with the pink seal of trust.</p>
        {v && <p className="relative mt-3 inline-flex rounded-full bg-pink/15 px-3 py-1 text-sm font-semibold text-pink ring-1 ring-pink/40">{until ? `Active until ${until.toLocaleDateString(undefined, { dateStyle: "medium" })} · extend below` : "Verified by the Shine team"}</p>}
      </motion.section>

      <h2 className="mb-3 px-1 font-display text-xl font-bold">What you get</h2>
      <div className="mb-6 grid gap-2.5 sm:grid-cols-2">
        {BENEFITS.map((b, i) => (
          <motion.div key={b.t} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: (i % 4) * 0.05 }} className="glass flex gap-3 rounded-2xl p-3.5">
            <motion.span whileHover={{ rotate: -10, scale: 1.1 }} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl icon-grad neu-sm text-pink">{b.i}</motion.span>
            <div><p className="font-semibold">{b.t}</p><p className="text-sm leading-snug text-white/55">{b.d}</p></div>
          </motion.div>
        ))}
      </div>

      <h2 className="mb-3 px-1 font-display text-xl font-bold">Choose your plan</h2>
      <div className="mb-4 grid grid-cols-3 gap-2">
        {VERIFY_PLANS.map((p) => (
          <motion.button key={p.id} whileTap={{ scale: 0.97 }} onClick={() => setPlan(p.id)} className={`relative rounded-3xl border p-3.5 text-left transition ${plan === p.id ? "border-pink/70 bg-pink/[.1] shadow-[var(--raise-sm)]" : "border-white/10 bg-white/[.03]"}`}>
            {"tag" in p && p.tag && <span className="absolute -top-2.5 right-2 rounded-full bg-pink px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">{p.tag}</span>}
            <p className="text-xs text-white/55">{p.label}</p>
            <p className="font-display text-2xl font-bold">${p.usd}</p>
            <p className="text-[11px] text-white/45">{price ? `≈ ${fmtSol(p.usd / price, 3)} SOL` : "…"}</p>
            <p className="mt-1 text-[11px] text-white/40">${(p.usd / p.months).toFixed(2)}/mo</p>
            {plan === p.id && <motion.span layoutId="plan-dot" className="absolute bottom-3 right-3 h-2.5 w-2.5 rounded-full bg-pink shadow-[var(--raise-sm)]" />}
          </motion.button>
        ))}
      </div>
      <div className="mb-3 grid gap-2">
        <Button size="lg" className="w-full" loading={busy && method !== "external"} onClick={() => start("shine")}>Pay {fmtUsd(sel.usd)} with Shine Wallet</Button>
        <Button size="lg" variant="glass" className="w-full" disabled={busy} onClick={() => start("external")}>Pay with Phantom, Solflare or QR</Button>
      </div>
      <p className="mb-6 text-center text-xs text-white/40">Paid in SOL at the live rate to {short(VERIFY_TREASURY, 4)}. Shine verifies the payment on-chain and activates your badge instantly. Badges expire at the end of the plan.</p>

      <BottomSheet open={method === "external" && !!intent} onClose={() => { setMethod(null); if (poll.current) clearInterval(poll.current); }} title="Pay with an external wallet">
        {intent && (
          <div className="space-y-4 pb-4">
            <div className="mx-auto w-fit rounded-3xl bg-white p-3 shadow-[var(--raise-sm)]">
              <QRCodeSVG value={intent.url} size={200} level="H" imageSettings={{ src: "/brand/star-192.png", height: 44, width: 44, excavate: true }} />
            </div>
            <div className="text-center"><p className="font-display text-2xl font-bold">{fmtSol(intent.sol, 6)} SOL</p><p className="text-xs text-white/50">≈ {fmtUsd(intent.usd)} · Solana Pay · {sel.label}</p></div>
            <AnimatePresence><motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-center gap-2 text-xs text-white/55"><motion.span className="h-2 w-2 rounded-full bg-pink" />Waiting for payment… scan with any Solana wallet</motion.p></AnimatePresence>
            <a href={intent.url} className="block"><Button variant="glass" className="w-full">Open in wallet app</Button></a>
            <ExternalWalletProvider>
              <ExternalPay recipient={intent.recipient} lamports={intent.lamports} reference={intent.reference} label={`Pay ${fmtSol(intent.sol, 4)} SOL`} onSent={(sig) => { toast("Payment sent — confirming…", "ok"); setTimeout(() => check(intent.reference, sig).catch(() => {}), 2500); }} />
            </ExternalWalletProvider>
          </div>
        )}
      </BottomSheet>
      <StatusOverlay kind={status?.kind ?? null} title={status?.title} message={status?.msg} onClose={() => setStatus(null)} />
    </div>
  );
}
