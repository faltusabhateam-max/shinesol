"use client";
import { fileToDataUrl } from "@/lib/image";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { doc, onSnapshot } from "firebase/firestore";
import { fb } from "@/lib/firebase";
import { C, PROJECT_FEE_BPS, projectFee } from "@/lib/config";
import { currentPeriod, MIN_USD, releaseMessage, SOL, STATUS_META, type EscrowPeriod, type EscrowPlan } from "@/lib/escrow";
import { useApi, useShineWallet } from "@/lib/client-api";
import { usePrice } from "@/lib/use-price";
import { fmtSol, fmtUsd, short, toDate } from "@/lib/format";
import { solscanTx } from "@/lib/solana";
import { BottomSheet } from "./bottom-sheet";
import { Button } from "./ui";
import { useToast } from "./toast";
import { errorKind, friendlyError } from "./status";
import { ICON } from "./icons";

export const VaultIcon = ({ s = 18 }: { s?: number }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="15" rx="3" /><circle cx="12" cy="12.5" r="3" /><path d="M12 9.5V8M15 12.5h1.5M7 20v1.5M17 20v1.5" /></svg>
);
const ShieldIcon = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3 4 6v6c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V6z" /><path d="m9 12 2 2 4-4" /></svg>;
const WarnIcon = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3 2 20h20z" /><path d="M12 9v5M12 17h.01" /></svg>;

export function useEscrowPlan(chatId: string, demo?: EscrowPlan | null) {
  const [plan, setPlan] = useState<EscrowPlan | null | undefined>(demo === undefined ? undefined : demo);
  useEffect(() => {
    if (demo !== undefined) return;
    return onSnapshot(doc(fb().db, C.escrow, chatId), (s) => setPlan(s.exists() ? ({ id: s.id, ...(s.data() as any) } as EscrowPlan) : null), () => setPlan(null));
  }, [chatId, demo]);
  return plan;
}

export function PeriodChip({ status }: { status: EscrowPeriod["status"] }) {
  const m = STATUS_META[status];
  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${m.tone}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{m.label}</span>;
}
const isDue = (p?: EscrowPeriod) => !!p && (p.status === "due" || (p.status === "funded" && (toDate(p.dueAt)?.getTime() || Infinity) <= Date.now()));

/** Banner under the chat header. */
export function EscrowBanner({ plan, amProject, onOpen }: { plan: EscrowPlan | null | undefined; amProject: boolean; onOpen: () => void }) {
  if (plan === undefined) return null;
  const cur = plan ? currentPeriod(plan) : undefined;
  const on = plan?.status === "active";
  let tone = "border-amber-300/30 bg-amber-400/[.08] text-amber-100", icon = WarnIcon, title = "", sub = "", cta = "";
  if (!on && plan?.status !== "off") {
    if (amProject) { tone = "border-pink/40 bg-pink/[.08] text-white"; icon = <VaultIcon />; title = plan ? "Finish enabling auto-payment" : "Set up auto-payment"; sub = plan ? `${fmtUsd(plan.usd)} ${plan.freq} · fund the first period to turn it on` : "Hold the creator's pay in the Shine vault so they can start with confidence."; cta = plan ? "Fund & enable" : "Set up"; }
    else { title = "Don't start work yet — the project hasn't enabled auto-payment."; sub = "You'll be notified here once payment is secured in the Shine vault."; }
  } else if (plan?.status === "off") { tone = "border-white/15 bg-white/[.04] text-white/80"; icon = <VaultIcon />; title = "Auto-payment is off"; sub = "Turned off by the Shine team."; cta = "Details"; }
  else if (plan && cur) {
    tone = "border-emerald-300/30 bg-emerald-400/[.07] text-white"; icon = ShieldIcon;
    title = `Auto-payment ON · ${fmtUsd(plan.usd)} ${plan.freq}`;
    const due = isDue(cur);
    sub = due ? `Payment #${cur.n} is due${amProject ? " — confirm the release" : " — waiting for the project to confirm"}` : cur.status === "awaiting_funding" ? `Payment #${cur.n} is awaiting funding${amProject ? " — fund the next period" : ""}` : cur.status === "funded" ? `Payment #${cur.n} funded · due ${toDate(cur.dueAt)?.toLocaleDateString(undefined, { month: "short", day: "numeric" })}` : STATUS_META[cur.status].label;
    if (due) tone = "border-pink/45 bg-pink/[.09] text-white";
    if (cur.status === "awaiting_funding") tone = "border-amber-300/30 bg-amber-400/[.08] text-white";
    cta = amProject && due ? "Release" : amProject && cur.status === "awaiting_funding" ? "Fund" : "View";
  }
  return (
    <motion.button type="button" onClick={onOpen} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
      className={`mb-3 flex w-full items-center gap-3 rounded-2xl border px-3.5 py-2.5 text-left ${tone}`}>
      <motion.span animate={{ scale: [1, 1.08, 1] }} transition={{ repeat: Infinity, duration: 2.4 }} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/10">{icon}</motion.span>
      <span className="min-w-0 flex-1"><span className="block text-[13.5px] font-semibold leading-snug">{title}</span><span className="block truncate text-xs opacity-70">{sub}</span></span>
      {cta && <span className="shrink-0 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold">{cta}</span>}
    </motion.button>
  );
}

export const DisputeIcon = () => (
  <motion.svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" animate={{ rotate: [0, -8, 8, 0] }} transition={{ repeat: Infinity, duration: 2.4, repeatDelay: 1.5 }}>
    <path d="M12 3v18M5 7h14M7 7l-3 7a3 3 0 0 0 6 0zM17 7l-3 7a3 3 0 0 0 6 0z" />
  </motion.svg>
);
/** The escrow sheet: setup, fund, release, refund/dispute, turn-off request. */
export function EscrowSheet({ open, onClose, plan, chatId, amProject, creatorName, onStatus }: {
  open: boolean; onClose: () => void; plan: EscrowPlan | null | undefined; chatId: string; amProject: boolean; creatorName: string;
  onStatus: (s: { kind: "success" | "failed" | "denied"; title: string; msg?: React.ReactNode }) => void;
}) {
  const api = useApi();
  const { pay, sign } = useShineWallet();
  const { usd: price } = usePrice();
  const toast = useToast();
  const [usd, setUsd] = useState("");
  const [freq, setFreq] = useState<"weekly" | "monthly">("weekly");
  const [busy, setBusy] = useState<string | null>(null);
  const [reason, setReason] = useState<{ kind: "refund" | "off"; n?: number } | null>(null);
  const [reasonText, setReasonText] = useState("");
  const [consent, setConsent] = useState(false);
  const [dispute, setDispute] = useState<number | null>(null);
  const [evidence, setEvidence] = useState<string[]>([]);
  const [links, setLinks] = useState("");
  const [agree, setAgree] = useState(false);
  useEffect(() => { if (plan) { setUsd(String(plan.usd)); setFreq(plan.freq); } }, [plan?.usd, plan?.freq]);
  const cur = plan ? currentPeriod(plan) : undefined;
  const editable = amProject && (!plan || plan.status === "draft");
  const amt = Number(usd);

  const run = async (key: string, fn: () => Promise<any>) => {
    setBusy(key);
    try { await fn(); } catch (e) {
      const k = errorKind(e);
      onStatus({ kind: k, title: k === "denied" ? "Cancelled" : "Something went wrong", msg: friendlyError(e) });
    }
    setBusy(null);
  };
  const fund = () => run("fund", async () => {
    if (editable && (!plan || plan.usd !== amt || plan.freq !== freq)) await api("/api/escrow", { action: "plan", chatId, usd: amt, freq });
    const q = await api<{ lamports: number; sol: number; usd: number; price: number; vault: string; period: number }>("/api/escrow", { action: "quote", chatId });
    const sig = await pay(q.vault, q.lamports, {
      title: plan?.status === "active" ? `Fund payment #${q.period}` : "Enable auto-payment",
      subtitle: `Held securely in the Shine vault and released to ${creatorName} when you confirm the work.`,
      amount: `${fmtSol(q.sol, 4)} SOL`, amountSub: `≈ ${fmtUsd(q.usd)} at $${q.price.toFixed(2)}/SOL`,
      rows: [["To", <span key="v" className="font-mono">Shine vault · {short(q.vault, 4)}</span>], ["Schedule", `${freq === "weekly" ? "Weekly" : "Monthly"} · payment #${q.period}`]],
      warning: plan?.status === "active" ? undefined : "Once enabled, auto-payment can't be turned off by the project. Only the Shine team can turn it off after a review.",
      confirmLabel: "Confirm & fund",
    });
    await api("/api/escrow", { action: "fund", chatId, signature: sig });
    onStatus({ kind: "success", title: plan?.status === "active" ? "Period funded" : "Auto-payment is on", msg: <>Funds are held in the Shine vault. <a className="text-pink underline" href={solscanTx(sig)} target="_blank" rel="noopener noreferrer">View on Solscan</a></> });
  });
  const release = (p: EscrowPeriod) => run(`rel${p.n}`, async () => {
    const message = releaseMessage(plan!, p);
    const signature = await sign(message, { title: `Release payment #${p.n}`, subtitle: `Send ${fmtSol(SOL(p.lamports), 4)} SOL from the Shine vault to ${creatorName}.`, rows: [["Escrowed", `${fmtSol(SOL(p.lamports), 4)} SOL ≈ ${fmtUsd(p.usd)}`], ["Creator receives", `${fmtSol(SOL((p.lamports || 0) - projectFee(p.lamports || 0)), 5)} SOL`], [`Shine fee (${PROJECT_FEE_BPS / 100}%)`, `${fmtSol(SOL(projectFee(p.lamports || 0)), 6)} SOL`], ["To", <span key="t" className="font-mono">{short(plan!.creatorWallet, 5)}</span>]], confirmLabel: "Sign & release" });
    const r = await api<{ signature: string }>("/api/escrow", { action: "release", chatId, n: p.n, message, signature });
    onStatus({ kind: "success", title: "Payment released", msg: <>{creatorName} has been paid. <a className="text-pink underline" href={solscanTx(r.signature)} target="_blank" rel="noopener noreferrer">View on Solscan</a></> });
  });
  const submitReason = () => run("reason", async () => {
    if (!reason) return;
    if (reason.kind === "refund") await api("/api/escrow", { action: "refund_request", chatId, n: reason.n, reason: reasonText });
    else { await api("/api/escrow", { action: "off_request", chatId, reason: reasonText }); setConsent(true); }
    toast(reason.kind === "refund" ? "Refund request sent to the Shine team" : "Request sent to the Shine team", "ok");
    setReason(null); setReasonText("");
  });
  const grant = () => run("grant", async () => { await api("/api/escrow", { action: "grant_access", chatId }); setConsent(false); toast("Shine team access granted for 5 minutes", "ok"); });

  return (
    <>
      <BottomSheet open={open && !reason && !consent} onClose={onClose} title="Auto-payment">
        <div className="space-y-4 pb-3">
          <div className="glass relative overflow-hidden rounded-3xl p-4">
            <motion.div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-pink/25 blur-3xl" animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 4 }} />
            <div className="relative flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-pink/15 text-pink ring-1 ring-pink/30"><VaultIcon s={22} /></span>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-pink">Shine vault escrow</p>
                <p className="font-display text-xl font-semibold">{plan ? `${fmtUsd(plan.usd)} / ${plan.freq === "weekly" ? "week" : "month"}` : "Not set up"}</p>
              </div>
              {plan && <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase ring-1 ${plan.status === "active" ? "bg-emerald-400/10 text-emerald-200 ring-emerald-300/30" : plan.status === "off" ? "bg-white/10 text-white/60 ring-white/20" : "bg-amber-400/10 text-amber-200 ring-amber-300/30"}`}>{plan.status === "active" ? "On" : plan.status === "off" ? "Off" : "Not funded"}</span>}
            </div>
            <ol className="relative mt-3 grid grid-cols-3 gap-2 text-center text-[11px] text-white/55">
              {["Project funds the vault", "Creator delivers the work", "Confirmed → creator paid (0.5% fee)"].map((t, i) => <li key={i} className="rounded-xl bg-white/[.04] px-2 py-2"><span className="mb-0.5 block font-bold text-pink">{i + 1}</span>{t}</li>)}
            </ol>
          </div>

          {editable && (
            <div className="space-y-3">
              <div>
                <label className="label" htmlFor="eu">Amount per period (USD)</label>
                <div className="relative"><span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xl font-semibold text-white/40">$</span>
                  <input id="eu" inputMode="decimal" className="input !pl-9 !text-2xl font-semibold" placeholder="100" value={usd} onChange={(e) => setUsd(e.target.value.replace(/[^0-9.]/g, ""))} /></div>
                <p className="mt-1.5 text-xs text-white/50">{price && amt ? `≈ ${fmtSol(amt / price, 4)} SOL now · converted at funding time` : `Minimum ${fmtUsd(MIN_USD)}`}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {(["weekly", "monthly"] as const).map((f) => (
                  <button key={f} type="button" onClick={() => setFreq(f)} className={`relative rounded-2xl border p-3 text-left transition ${freq === f ? "border-pink/60 bg-pink/10" : "border-white/10 bg-white/[.03]"}`}>
                    <span className="block font-semibold">{f === "weekly" ? "Weekly" : "Monthly"}</span><span className="text-xs text-white/50">Every {f === "weekly" ? "7" : "30"} days</span>
                    {freq === f && <motion.span layoutId="freq" className="absolute right-3 top-3 h-2.5 w-2.5 rounded-full bg-pink shadow-[0_0_12px_#ff2fa6]" />}
                  </button>
                ))}
              </div>
              <Button size="lg" className="w-full" loading={busy === "fund"} disabled={!(amt >= MIN_USD)} onClick={fund}><VaultIcon /> Fund first period & enable</Button>
              <p className="text-center text-[11px] text-white/40">Once enabled, auto-payment can only be turned off by the Shine team.</p>
            </div>
          )}

          {plan && plan.periods?.length > 0 && plan.status !== "draft" && (
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">Payments</p>
              <div className="space-y-2">
                {[...plan.periods].reverse().map((p) => (
                  <motion.div key={p.n} layout className="rounded-2xl border border-white/10 bg-white/[.03] p-3">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">#{p.n}</span>
                      <span className="text-sm text-white/70">{fmtUsd(p.usd)}{p.lamports ? ` · ${fmtSol(SOL(p.lamports), 4)} SOL` : ""}</span>
                      <span className="ml-auto"><PeriodChip status={isDue(p) && p.status === "funded" ? "due" : p.status} /></span>
                    </div>
                    <p className="mt-1 text-xs text-white/45">
                      {p.status === "funded" || p.status === "due" ? `Due ${toDate(p.dueAt)?.toLocaleDateString(undefined, { dateStyle: "medium" })}` : p.status === "released" ? `Released ${toDate(p.releasedAt)?.toLocaleDateString(undefined, { dateStyle: "medium" })}` : p.status === "disputed" ? "Under review by the Shine team" : p.status === "refunded" ? "Refunded to the project" : "Waiting for the project to fund this period"}
                      {(p.releaseTx || p.fundTx || p.refundTx) && <> · <a href={solscanTx((p.releaseTx || p.refundTx || p.fundTx)!)} target="_blank" rel="noopener noreferrer" className="text-pink hover:underline">Solscan</a></>}
                    </p>
                    {!amProject && (p.status === "due" || isDue(p)) && p.status !== "disputed" && (
                      <div className="mt-2"><Button size="sm" variant="danger" className="w-full" onClick={() => { setDispute(p.n); setReasonText(""); setEvidence([]); setLinks(""); }}><DisputeIcon /> Report project / Open dispute</Button></div>
                    )}
                    {amProject && plan.status === "active" && (
                      <div className="mt-2 flex gap-2">
                        {isDue(p) && <Button size="sm" className="flex-1" loading={busy === `rel${p.n}`} onClick={() => release(p)}>Confirm release</Button>}
                        {(p.status === "funded" || p.status === "due") && <Button size="sm" variant="glass" className={isDue(p) ? "" : "flex-1"} onClick={() => setReason({ kind: "refund", n: p.n })}>Request refund</Button>}
                        {p.status === "awaiting_funding" && p === cur && <Button size="sm" className="flex-1" loading={busy === "fund"} onClick={fund}>Fund payment #{p.n}</Button>}
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {amProject && plan?.status === "active" && (
            plan.offRequest?.status === "pending"
              ? <div className="rounded-2xl border border-white/10 bg-white/[.03] p-3 text-sm text-white/65">Your request to turn auto-payment off is with the Shine team.{toDate(plan.offRequest.accessUntil) && toDate(plan.offRequest.accessUntil)!.getTime() > Date.now() ? " Chat access is currently granted." : <> <button className="font-semibold text-pink hover:underline" onClick={() => setConsent(true)}>Grant chat access</button></>}</div>
              : <button className="w-full text-center text-xs font-semibold text-white/45 hover:text-white/70" onClick={() => setReason({ kind: "off" })}>Request to turn auto-payment off</button>
          )}
          {!amProject && plan?.status === "active" && <p className="text-center text-xs text-white/45">Payments are released from the Shine vault to {short(plan.creatorWallet, 4)} when the project confirms each period.</p>}
        </div>
      </BottomSheet>

      <BottomSheet open={!!reason} onClose={() => setReason(null)} title={reason?.kind === "refund" ? `Request a refund · #${reason?.n}` : "Turn auto-payment off"}>
        <div className="space-y-3 pb-3">
          <p className="text-sm text-white/60">{reason?.kind === "refund" ? "Tell the Shine team what went wrong. The payment stays locked in the vault while we review." : "Auto-payment can only be turned off by the Shine team. Tell us why — we may ask you to grant temporary access to this chat."}</p>
          <textarea className="input min-h-28" maxLength={1000} placeholder="Describe the issue…" value={reasonText} onChange={(e) => setReasonText(e.target.value)} />
          <Button className="w-full" loading={busy === "reason"} disabled={reasonText.trim().length < 10} onClick={submitReason}>Send to Shine team</Button>
        </div>
      </BottomSheet>

      <BottomSheet open={dispute != null} onClose={() => setDispute(null)} title={`Open a dispute · payment #${dispute ?? ""}`}>
        <div className="space-y-3 pb-3">
          <p className="text-sm text-white/60">If the project hasn't confirmed payment after you completed the agreed work, Shine holds the funds while the case is reviewed. <a href="/disputes" target="_blank" className="text-pink underline">Dispute Policy</a></p>
          <textarea className="input min-h-28" maxLength={2000} placeholder="Describe the work you delivered and what happened…" value={reasonText} onChange={(e) => setReasonText(e.target.value)} />
          <input className="input" placeholder="Links to your work (comma-separated, optional)" value={links} onChange={(e) => setLinks(e.target.value)} />
          <div className="flex flex-wrap gap-2">
            {evidence.map((e, i) => <div key={i} className="relative h-16 w-16 overflow-hidden rounded-xl ring-1 ring-white/15"><img src={e} alt="" className="h-full w-full object-cover" /><button type="button" onClick={() => setEvidence((x) => x.filter((_, j) => j !== i))} className="absolute right-0.5 top-0.5 rounded-full bg-black/70 px-1 text-[10px]">✕</button></div>)}
            {evidence.length < 3 && <label className="grid h-16 w-16 cursor-pointer place-items-center rounded-xl border border-dashed border-white/20 text-xs text-white/50 hover:border-pink/50">+ Proof<input type="file" accept="image/*" hidden onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ""; if (!f) return; try { const { dataUrl } = await fileToDataUrl(f, 1000, 240_000); setEvidence((x) => [...x, dataUrl]); } catch { toast("Couldn't read that image", "err"); } }} /></label>}
          </div>
          <label className="flex items-start gap-2 rounded-2xl bg-white/[.04] p-3 text-xs text-white/65"><input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 accent-[#ff2fa6]" />I allow the Shine team to review this chat's records and my evidence for this dispute. Every review is logged.</label>
          <Button className="w-full" variant="danger" loading={busy === "dispute"} disabled={reasonText.trim().length < 20 || !agree} onClick={() => run("dispute", async () => {
            await api("/api/escrow", { action: "creator_dispute", chatId, n: dispute, reason: reasonText.trim(), evidence, links: links.split(/[,\s]+/).filter((x) => /^https?:\/\//.test(x)) });
            setDispute(null); onStatus({ kind: "success", title: "Dispute opened", msg: "The funds are held in the Shine Vault while our team reviews the case. We'll update you in this chat." });
          })}>Open dispute</Button>
        </div>
      </BottomSheet>

      <BottomSheet open={consent} onClose={() => setConsent(false)} title="Grant Shine team access">
        <div className="space-y-4 pb-3">
          <div className="flex items-start gap-3 rounded-2xl border border-pink/30 bg-pink/[.06] p-3.5">
            <span className="text-pink">{ICON.lock}</span>
            <p className="text-sm text-white/75"><b className="text-white">Grant Shine team access to this chat for 5 minutes.</b> A Shine admin can read this conversation only — no other chats — and access expires automatically. Every view is logged.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="glass" className="flex-1" onClick={() => setConsent(false)}>Not now</Button>
            <Button className="flex-[2]" loading={busy === "grant"} onClick={grant}>Grant 5-minute access</Button>
          </div>
        </div>
      </BottomSheet>
    </>
  );
}

/** System messages posted by the Shine server into a chat. */
export function EscrowMessage({ m }: { m: { text?: string; signature?: string; kind?: string; amount?: number } }) {
  const tone = m.kind === "released" ? "text-emerald-200" : m.kind === "disputed" || m.kind === "due" ? "text-pink" : "text-white/80";
  return (
    <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="mx-auto my-2 w-full max-w-md">
      <div className="glass flex items-start gap-3 rounded-2xl p-3">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-pink/15 text-pink ring-1 ring-pink/30"><VaultIcon s={16} /></span>
        <div className="min-w-0 text-sm">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-pink">Shine escrow</p>
          <p className={tone}>{m.text}</p>
          {m.signature && <a href={solscanTx(m.signature)} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-pink hover:underline">View on Solscan {ICON.external}</a>}
        </div>
      </div>
    </motion.div>
  );
}
