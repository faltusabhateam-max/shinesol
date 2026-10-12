"use client";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { collection, onSnapshot } from "firebase/firestore";
import { fb } from "@/lib/firebase";
import { C } from "@/lib/config";
import { useAdmin } from "@/components/admin";
import { currentPeriod, SOL, type EscrowPeriod, type EscrowPlan } from "@/lib/escrow";
import { PeriodChip, VaultIcon } from "@/components/escrow";
import { Button } from "@/components/ui";
import { BottomSheet } from "@/components/bottom-sheet";
import { useToast } from "@/components/toast";
import { fmtSol, fmtUsd, short, toDate } from "@/lib/format";
import { solscanAccount, solscanTx } from "@/lib/solana";

const DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === "1";
const d = (m: number) => new Date(Date.now() - m * 60000);
const DEMO_PLANS: EscrowPlan[] = [
  { id: "c1", chatId: "c1", projectUid: "p1", creatorUid: "u1", projectName: "Orbit Labs", creatorUsername: "Zorveny", usd: 100, freq: "weekly", status: "active", creatorWallet: "9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin", projectWallet: "86xCnPeV69n6t3DnyGvkKobf9FdN2H9oiVDdaMpo2MMY",
    periods: [{ n: 1, usd: 100, lamports: 560_000_000, status: "released", releasedAt: d(9000), releaseTx: "x" }, { n: 2, usd: 100, lamports: 545_000_000, status: "disputed", fundedAt: d(8000), dueAt: d(100), dispute: { reason: "Work delivered, project hasn't confirmed payment #2.", at: d(60), by: "creator" } as any }],
    offRequest: { status: "pending", reason: "The campaign ended early; we'd like to stop future payments.", requestedAt: d(50), accessUntil: new Date(Date.now() + 3.2 * 60000) } },
  { id: "c2", chatId: "c2", projectUid: "p2", creatorUid: "u2", projectName: "Shine", creatorUsername: "solwriter", usd: 450, freq: "monthly", status: "active", creatorWallet: "3Fz9Kx7d8VpWQm1Yb2nR4tLcS6uHjE5aGiT9oP2kXyZq", periods: [{ n: 1, usd: 450, lamports: 2_480_000_000, status: "funded", fundedAt: d(2000), dueAt: new Date(Date.now() + 20 * 86400000) }] },
  { id: "c3", chatId: "c3", projectUid: "p3", creatorUid: "u3", projectName: "Nebula DAO", creatorUsername: "memequeen", usd: 60, freq: "weekly", status: "active", creatorWallet: "7Wn3Q2bR8yTqL5mK1xC9vJ4hF6dS2aG8eP3uN5oZ1kXc", periods: [{ n: 4, usd: 60, lamports: 330_000_000, status: "due", fundedAt: d(10100), dueAt: d(20) }] },
  { id: "c4", chatId: "c4", projectUid: "p4", creatorUid: "u4", projectName: "Pixel Guild", creatorUsername: "artbyrae", usd: 200, freq: "monthly", status: "off", creatorWallet: "5Tq1", periods: [{ n: 2, usd: 200, lamports: 1_100_000_000, status: "refunded" }] },
];
type Filter = "all" | "attention" | "active" | "off";

export default function AdminEscrow() {
  const { call } = useAdmin();
  const toast = useToast();
  const [plans, setPlans] = useState<EscrowPlan[] | null>(DEMO ? DEMO_PLANS : null);
  const [vault, setVault] = useState<{ address: string | null; balance: number | null; error?: string | null } | null>(DEMO ? { address: "7DgJBdwgnwPLS5LzGjmuPPcT7YC2WZJ4mmuEsaEqZcNx", balance: 3.3551 } : null);
  const [filter, setFilter] = useState<Filter>("attention");
  const [sel, setSel] = useState<string | null>(DEMO ? "c1" : null);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ label: string; run: () => Promise<void>; danger?: boolean; text: string } | null>(null);
  const [chatView, setChatView] = useState<{ until: string; messages: any[] } | null>(null);
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  useEffect(() => {
    if (DEMO) return;
    const u = onSnapshot(collection(fb().db, C.escrow), (s) => setPlans(s.docs.map((x) => ({ id: x.id, ...(x.data() as any) }) as EscrowPlan)), () => setPlans([]));
    call("/api/admin/escrow", { action: "vault" }).then(setVault).catch((e) => setVault({ address: null, balance: null, error: e.message }));
    return u;
  }, [call]);
  const needs = (p: EscrowPlan) => p.offRequest?.status === "pending" || p.periods?.some((x) => x.status === "disputed");
  const list = useMemo(() => (plans || []).filter((p) => filter === "all" || (filter === "attention" ? needs(p) : filter === "active" ? p.status === "active" : p.status === "off")), [plans, filter]);
  const held = useMemo(() => (plans || []).flatMap((p) => p.periods || []).filter((x) => ["funded", "due", "disputed"].includes(x.status)).reduce((s, x) => s + SOL(x.lamports), 0), [plans]);
  const plan = plans?.find((p) => p.id === sel) || null;
  const accessLeft = plan?.offRequest?.accessUntil ? (toDate(plan.offRequest.accessUntil)?.getTime() || 0) - now : 0;

  const act = (key: string, body: Record<string, any>, ok: string) => async () => {
    setBusy(key);
    try { const r = await call("/api/admin/escrow", body); toast(ok, "ok"); setCaseView(null); if (r?.signature) toast("On-chain transfer confirmed", "ok"); } catch (e: any) { toast(e.message, "err"); }
    setBusy(null); setConfirm(null);
  };
  const ask = (label: string, text: string, run: () => Promise<void>, danger = false) => setConfirm({ label, text, run, danger });
  const viewChat = async () => {
    if (DEMO) { setChatView({ until: new Date(Date.now() + 3.2 * 60000).toISOString(), messages: [{ id: "1", senderUid: "p1", type: "text", text: "Hey! Please post 2 threads per week as agreed." }, { id: "2", senderUid: "u1", type: "text", text: "On it — first thread goes live tomorrow." }, { id: "3", senderUid: "shine", type: "escrow", text: "Payment #2 funded: 0.5450 SOL ≈ $100 is held in the Shine vault." }] }); return; }
    try { const r = await call("/api/admin/escrow", { action: "chat", chatId: plan!.chatId }); setChatView({ until: r.accessUntil, messages: r.messages }); } catch (e: any) { toast(e.message, "err"); }
  };
  const [caseView, setCaseView] = useState<null | { n: number; lamports: number; dispute: any; messages: any[] | null; chatAccess: string }>(null);
  const openCase = async (p: EscrowPeriod) => {
    if (DEMO) {
      setCaseView({ n: p.n, lamports: p.lamports || 0, chatAccess: "granted", dispute: { by: "creator", reason: "I delivered all 8 threads and 2 Spaces as agreed (links below). The project stopped replying after the due date and hasn't confirmed payment #2.", links: ["https://x.com/zorveny/status/1844", "https://x.com/zorveny/status/1846"], evidence: ["/brand/banner.jpg"], openedAt: new Date().toISOString() },
        messages: [{ id: "1", senderUid: plan!.projectUid, type: "text", text: "Please post 2 threads per week + 1 Space. Weekly payment via Shine escrow." }, { id: "2", senderUid: plan!.creatorUid, type: "text", text: "Week 1 done — threads are live, links attached." }, { id: "3", senderUid: "shine", type: "escrow", text: "Payment #2 funded: 0.5450 SOL is held in the Shine vault." }, { id: "4", senderUid: plan!.creatorUid, type: "text", text: "Week 2 delivered. Could you confirm the release?" }] });
      return;
    }
    try { const r = await call("/api/admin/escrow", { action: "dispute_case", chatId: plan!.chatId, n: p.n }); setCaseView({ n: p.n, lamports: p.lamports || 0, ...r }); } catch (e: any) { toast(e.message, "err"); }
  };
  const PeriodActions = ({ p }: { p: EscrowPeriod }) => !["funded", "due", "disputed"].includes(p.status) ? null : (
    <div className="mt-2 flex flex-wrap gap-2">
      <Button size="sm" loading={busy === `r${p.n}`} onClick={() => ask("Approve release", `Send ${fmtSol(SOL(p.lamports), 4)} SOL from the vault to @${plan!.creatorUsername}?`, act(`r${p.n}`, { action: "release", chatId: plan!.chatId, n: p.n }, "Payment released"))}>Approve release</Button>
      <Button size="sm" variant="glass" loading={busy === `f${p.n}`} onClick={() => ask("Refund to project", `Refund ${fmtSol(SOL(p.lamports), 4)} SOL from the vault to ${plan!.projectName}?`, act(`f${p.n}`, { action: "refund", chatId: plan!.chatId, n: p.n }, "Refund sent"), true)}>Refund to project</Button>
      {p.status === "disputed" && <Button size="sm" variant="danger" onClick={() => openCase(p)}>Open dispute case</Button>}
      {p.status === "disputed" && <Button size="sm" variant="ghost" loading={busy === `d${p.n}`} onClick={act(`d${p.n}`, { action: "deny", chatId: plan!.chatId, n: p.n }, "Refund request denied")}>Deny refund</Button>}
    </div>
  );

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div><p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-pink">Shine vault</p><h1 className="font-display text-3xl font-semibold">Escrow</h1><p className="text-sm text-white/50">Auto-payment plans, held balances, disputes and off-requests.</p></div>
      </div>
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ["Vault balance", vault?.balance != null ? `${fmtSol(vault.balance, 4)} SOL` : vault?.error ? "Unavailable" : "…", vault?.address ? <a key="a" href={solscanAccount(vault.address)} target="_blank" rel="noopener noreferrer" className="hover:text-pink">{short(vault.address, 5)}</a> : vault?.error],
          ["Held in escrow", `${fmtSol(held, 4)} SOL`, "Funded, due & disputed"],
          ["Active plans", String((plans || []).filter((p) => p.status === "active").length), `${(plans || []).length} total`],
          ["Needs attention", String((plans || []).filter(needs).length), "Disputes & off-requests"],
        ].map(([l, v, sub], i) => (
          <motion.div key={String(l)} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className={`glass relative overflow-hidden rounded-3xl p-4 ${i === 3 && Number(v) > 0 ? "neon" : ""}`}>
            <motion.div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-pink/20 blur-2xl" animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 4, delay: i * 0.3 }} />
            <span className="relative grid h-10 w-10 place-items-center rounded-2xl bg-pink/15 text-pink ring-1 ring-pink/30"><VaultIcon /></span>
            <p className="relative mt-3 font-display text-2xl font-semibold">{v}</p><p className="relative text-sm font-semibold text-white/80">{l}</p><p className="relative truncate text-xs text-white/45">{sub}</p>
          </motion.div>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div>
          <div className="mb-3 flex gap-1 rounded-2xl bg-white/[.04] p-1 text-sm font-semibold">
            {(["attention", "active", "off", "all"] as Filter[]).map((f) => (
              <button key={f} onClick={() => setFilter(f)} className={`relative flex-1 rounded-xl py-2 ${filter === f ? "text-white" : "text-white/50"}`}>
                {filter === f && <motion.span layoutId="esc-f" className="absolute inset-0 rounded-xl bg-pink/20 ring-1 ring-pink/40" />}<span className="relative">{f === "attention" ? "Attention" : f[0].toUpperCase() + f.slice(1)}</span>
              </button>
            ))}
          </div>
          <div className="space-y-2">
            {plans === null ? <div className="skeleton h-20 rounded-3xl" /> : !list.length ? <p className="glass rounded-3xl p-6 text-center text-sm text-white/50">Nothing here.</p> : list.map((p, i) => {
              const cur = currentPeriod(p);
              return (
                <motion.button key={p.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} onClick={() => { setSel(p.id); setChatView(null); }}
                  className={`glass flex w-full items-center gap-3 rounded-2xl p-3 text-left transition hover:border-pink/40 ${sel === p.id ? "!border-pink/50 bg-pink/[.05]" : ""}`}>
                  <span className={`grid h-10 w-10 place-items-center rounded-xl ring-1 ${p.status === "active" ? "bg-emerald-400/10 text-emerald-200 ring-emerald-300/30" : "bg-white/5 text-white/50 ring-white/15"}`}><VaultIcon /></span>
                  <div className="min-w-0 flex-1"><p className="truncate font-semibold">{p.projectName} → @{p.creatorUsername}</p><p className="truncate text-xs text-white/50">{fmtUsd(p.usd)} {p.freq} · {p.status}{p.offRequest?.status === "pending" ? " · off-request" : ""}</p></div>
                  {cur && <PeriodChip status={cur.status} />}
                </motion.button>
              );
            })}
          </div>
        </div>
        <AnimatePresence mode="wait">
          {plan ? (
            <motion.div key={plan.id} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="glass rounded-3xl p-5">
              <div className="flex items-start justify-between gap-3">
                <div><p className="font-display text-xl font-semibold">{plan.projectName} → @{plan.creatorUsername}</p><p className="text-sm text-white/50">{fmtUsd(plan.usd)} {plan.freq} · creator wallet <a className="font-mono hover:text-pink" href={solscanAccount(plan.creatorWallet)} target="_blank" rel="noopener noreferrer">{short(plan.creatorWallet, 4)}</a></p></div>
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase ring-1 ${plan.status === "active" ? "bg-emerald-400/10 text-emerald-200 ring-emerald-300/30" : "bg-white/10 text-white/60 ring-white/20"}`}>{plan.status === "active" ? "Auto-pay on" : plan.status}</span>
              </div>
              {plan.offRequest?.status === "pending" && (
                <div className="mt-4 rounded-2xl border border-pink/35 bg-pink/[.06] p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-pink">Request to turn auto-payment off</p>
                  <p className="mt-1 text-sm text-white/80">“{plan.offRequest.reason}”</p>
                  <p className="mt-2 text-xs text-white/50">{accessLeft > 0 ? <>Chat access granted · <b className="text-emerald-300">{Math.floor(accessLeft / 60000)}:{String(Math.floor((accessLeft % 60000) / 1000)).padStart(2, "0")}</b> left</> : "The project hasn't granted chat access (or the 5-minute window expired)."}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" variant="glass" disabled={accessLeft <= 0} onClick={viewChat}>View chat (5-min access)</Button>
                    <Button size="sm" variant="danger" loading={busy === "off"} onClick={() => ask("Turn auto-payment off", `Turn auto-payment off for ${plan.projectName} → @${plan.creatorUsername}? Funds already in escrow stay until you release or refund them.`, act("off", { action: "off", chatId: plan.chatId }, "Auto-payment turned off"), true)}>Turn off</Button>
                    <Button size="sm" variant="ghost" loading={busy === "denyoff"} onClick={act("denyoff", { action: "deny_off", chatId: plan.chatId }, "Request declined")}>Keep on</Button>
                  </div>
                </div>
              )}
              {plan.status === "active" && plan.offRequest?.status !== "pending" && (
                <div className="mt-3"><Button size="sm" variant="ghost" onClick={() => ask("Turn auto-payment off", "Turn auto-payment off for this plan?", act("off", { action: "off", chatId: plan.chatId }, "Auto-payment turned off"), true)}>Turn auto-payment off</Button></div>
              )}
              <p className="mb-2 mt-5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">Periods</p>
              <div className="space-y-2">
                {[...(plan.periods || [])].reverse().map((p) => (
                  <div key={p.n} className={`rounded-2xl border p-3 ${p.status === "disputed" ? "border-red-400/30 bg-red-500/[.05]" : "border-white/10 bg-white/[.03]"}`}>
                    <div className="flex items-center gap-2"><span className="font-semibold">#{p.n}</span><span className="text-sm text-white/70">{fmtUsd(p.usd)}{p.lamports ? ` · ${fmtSol(SOL(p.lamports), 4)} SOL` : ""}</span><span className="ml-auto"><PeriodChip status={p.status} /></span></div>
                    {p.dispute && p.status === "disputed" && <p className="mt-1.5 text-sm text-red-100/80">{(p.dispute as any).by === "creator" ? "Creator dispute" : "Refund request"}: “{p.dispute.reason}”</p>}
                    <p className="mt-1 text-xs text-white/45">{p.dueAt ? `Due ${toDate(p.dueAt)?.toLocaleDateString(undefined, { dateStyle: "medium" })}` : ""}{(p.releaseTx || p.fundTx) && p.releaseTx !== "x" ? <> · <a className="text-pink hover:underline" href={solscanTx((p.releaseTx || p.fundTx)!)} target="_blank" rel="noopener noreferrer">Solscan</a></> : null}</p>
                    <PeriodActions p={p} />
                  </div>
                ))}
              </div>
            </motion.div>
          ) : <div className="glass hidden place-items-center rounded-3xl p-10 text-sm text-white/40 lg:grid">Select a plan</div>}
        </AnimatePresence>
      </div>

      <BottomSheet open={!!confirm} onClose={() => !busy && setConfirm(null)} title={confirm?.label}>
        {confirm && <div className="space-y-4 pb-3"><p className="text-sm text-white/70">{confirm.text}</p><div className="flex gap-2"><Button variant="glass" className="flex-1" onClick={() => setConfirm(null)}>Cancel</Button><Button variant={confirm.danger ? "danger" : "pink"} className="flex-[2]" loading={!!busy} onClick={confirm.run}>{confirm.label}</Button></div></div>}
      </BottomSheet>
      <BottomSheet open={!!caseView} onClose={() => !busy && setCaseView(null)} title={caseView ? `Dispute case · payment #${caseView.n}` : ""}>
        {caseView && plan && (
          <div className="space-y-4 pb-4">
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-2xl bg-white/[.04] p-2.5"><p className="text-white/45">Held</p><p className="font-semibold">{fmtSol(SOL(caseView.lamports), 4)} SOL</p></div>
              <div className="rounded-2xl bg-white/[.04] p-2.5"><p className="text-white/45">Opened by</p><p className="font-semibold">{caseView.dispute?.by === "creator" ? `@${plan.creatorUsername}` : plan.projectName}</p></div>
              <div className="rounded-2xl bg-white/[.04] p-2.5"><p className="text-white/45">Chat records</p><p className={`font-semibold ${caseView.chatAccess === "granted" ? "text-emerald-300" : "text-amber-200"}`}>{caseView.chatAccess === "granted" ? "Consented" : "Not granted"}</p></div>
            </div>
            {caseView.dispute && <div className="rounded-2xl border border-red-400/25 bg-red-500/[.05] p-3"><p className="text-[11px] font-semibold uppercase tracking-wider text-red-200/70">Statement</p><p className="mt-1 whitespace-pre-wrap text-sm text-white/85">{caseView.dispute.reason}</p>
              {!!caseView.dispute.links?.length && <div className="mt-2 space-y-1">{caseView.dispute.links.map((l: string) => <a key={l} href={l} target="_blank" rel="noopener noreferrer nofollow" className="block truncate text-xs text-pink underline">{l}</a>)}</div>}</div>}
            {!!caseView.dispute?.evidence?.length && <div><p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/45">Work evidence</p><div className="flex flex-wrap gap-2">{caseView.dispute.evidence.map((e: string, i: number) => <a key={i} href={e} target="_blank" rel="noopener noreferrer"><img src={e} alt="" className="h-24 w-24 rounded-xl object-cover ring-1 ring-white/15" /></a>)}</div></div>}
            <div>
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/45">Chat records {caseView.messages && <span className="normal-case text-white/35">· read-only, audit-logged</span>}</p>
              {caseView.messages ? <div className="max-h-[30vh] space-y-1.5 overflow-y-auto rounded-2xl bg-black/30 p-2">{caseView.messages.map((m: any) => (
                <div key={m.id} className={`rounded-xl px-3 py-1.5 text-sm ${m.senderUid === "shine" ? "bg-pink/10 text-pink" : m.senderUid === plan.projectUid ? "mr-8 bg-white/[.06]" : "ml-8 bg-white/[.03]"}`}>
                  <p className="text-[10px] font-semibold uppercase text-white/40">{m.senderUid === "shine" ? "Shine" : m.senderUid === plan.projectUid ? plan.projectName : `@${plan.creatorUsername}`}</p>
                  {m.image ? <img src={m.image} alt="" className="mt-1 max-h-32 rounded-lg" /> : m.text || m.type}
                </div>))}</div>
                : <p className="rounded-2xl bg-white/[.04] p-3 text-xs text-white/55">The chat hasn&apos;t been shared for this case. Creator-opened disputes include consent automatically; for project requests, ask the project to grant 5-minute access.</p>}
            </div>
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-white/45">Resolution</p>
              <Button className="w-full" loading={busy === "cr"} onClick={() => ask("Release 100% to creator", `Send ${fmtSol(SOL(caseView.lamports), 4)} SOL (less the 0.5% fee) to @${plan.creatorUsername}?`, act("cr", { action: "release", chatId: plan.chatId, n: caseView.n }, "Released to creator"))}>Release 100% to creator</Button>
              <Button className="w-full" variant="glass" loading={busy === "cs"} onClick={() => ask("Split 70 / 30", `Send 70% (${fmtSol(SOL(caseView.lamports) * 0.7, 4)} SOL) to @${plan.creatorUsername} and allocate 30% (${fmtSol(SOL(caseView.lamports) * 0.3, 4)} SOL) to the Shine Vault. Recorded publicly as a Dispute resolution.`, act("cs", { action: "split", chatId: plan.chatId, n: caseView.n }, "Dispute resolved 70/30"), true)}>Split 70% creator / 30% Shine Vault</Button>
              <Button className="w-full" variant="danger" loading={busy === "cf"} onClick={() => ask("Refund project", `Refund ${fmtSol(SOL(caseView.lamports), 4)} SOL to ${plan.projectName}?`, act("cf", { action: "refund", chatId: plan.chatId, n: caseView.n }, "Refunded to project"), true)}>Refund project</Button>
            </div>
          </div>
        )}
      </BottomSheet>
      <BottomSheet open={!!chatView} onClose={() => setChatView(null)} title="Consented chat view">
        {chatView && (
          <div className="space-y-2 pb-3">
            <p className="rounded-xl bg-emerald-400/10 px-3 py-2 text-xs text-emerald-200">Read-only · access expires {new Date(chatView.until).toLocaleTimeString()} · this view is audit-logged</p>
            <div className="max-h-[45vh] space-y-2 overflow-y-auto">
              {chatView.messages.map((m) => (
                <div key={m.id} className={`rounded-2xl px-3 py-2 text-sm ${m.senderUid === "shine" ? "bg-pink/10 text-pink" : m.senderUid === plan?.projectUid ? "bg-white/[.06]" : "ml-8 bg-white/[.03]"}`}>
                  <p className="text-[10px] font-semibold uppercase text-white/40">{m.senderUid === "shine" ? "Shine" : m.senderUid === plan?.projectUid ? plan?.projectName : `@${plan?.creatorUsername}`}</p>
                  {m.text || (m.image ? "📷 Image" : m.type)}
                </div>
              ))}
            </div>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
