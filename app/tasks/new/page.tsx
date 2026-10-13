"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { useSession } from "@/components/providers";
import { BackLink, Button, Empty } from "@/components/ui";
import { BottomSheet } from "@/components/bottom-sheet";
import { IconTile, LIcon } from "@/components/line-icons";
import { StatusOverlay, errorKind, friendlyError } from "@/components/status";
import { ExternalPay, ExternalWalletProvider } from "@/components/external-wallet";
import { useApi, useShineWallet } from "@/lib/client-api";
import { usePrice } from "@/lib/use-price";
import { MAX_SUBTASKS, SUBTASK_TYPES, TASK_MIN_USD, taskIssues, totalOf, type SubTask, type SubTaskType } from "@/lib/tasks";
import { fmtSol, fmtUsd, short } from "@/lib/format";
import { FEE_WALLET } from "@/lib/config";
import { useToast } from "@/components/toast";

const DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === "1";
type Intent = { id: string; reference: string; lamports: number; sol: number; usd: number; price: number; recipient: string; url: string };
const nid = () => Math.random().toString(36).slice(2, 8);
const input = "w-full rounded-2xl border border-white/10 bg-white/[.04] px-3.5 py-3 text-[15px] outline-none placeholder:text-white/30 focus:border-pink/50";

export default function NewTask() {
  const { authenticated, login } = useSession();
  const router = useRouter();
  const api = useApi();
  const { pay } = useShineWallet();
  const toast = useToast();
  const { usd: price } = usePrice();
  const [title, setTitle] = useState(DEMO ? "Join the Shine community & spread the word" : "");
  const [desc, setDesc] = useState(DEMO ? "Join our Telegram channel, follow us on X and repost the launch announcement." : "");
  const [subs, setSubs] = useState<SubTask[]>(DEMO ? [{ id: "a", type: "tg_channel", label: "", link: "https://t.me/ShineSol", usd: 0.5 }, { id: "b", type: "x_follow", label: "", link: "https://x.com/ShineSol_", usd: 0.25 }, { id: "c", type: "x_repost", label: "", link: "https://x.com/ShineSol_/status/1844", usd: 0.25 }] : []);
  const [limit, setLimit] = useState(DEMO ? "100" : "50");
  const [picker, setPicker] = useState(false);
  const [intent, setIntent] = useState<Intent | null>(null);
  const [method, setMethod] = useState<"shine" | "external">("shine");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ kind: "success" | "failed" | "denied"; title: string; msg?: React.ReactNode } | null>(null);
  const poll = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => () => { if (poll.current) clearInterval(poll.current); }, []);
  useEffect(() => {
    if (!DEMO) return;
    const q = new URLSearchParams(location.search).get("fund");
    if (q) { setMethod(q === "external" ? "external" : "shine"); setIntent({ id: "demo", reference: "8vS4tX1m2Y9TQd3bF7nKpQe6WcRhL5uZaJ2sGxV9NnBo", lamports: 554_000_000, sol: 0.554, usd: 100, price: 180.5, recipient: FEE_WALLET, url: `solana:${FEE_WALLET}?amount=0.554&reference=8vS4tX1m2Y9TQd3bF7nKpQe6WcRhL5uZaJ2sGxV9NnBo&label=Shine` }); }
  }, []);

  const lim = Math.floor(Number(limit) || 0);
  const perUser = Math.round(subs.reduce((a, s) => a + (Number(s.usd) || 0), 0) * 100) / 100;
  const total = totalOf(subs, lim);
  const issues = taskIssues({ title, description: desc, subtasks: subs, limit: lim });
  const upd = (id: string, p: Partial<SubTask>) => setSubs((x) => x.map((s) => (s.id === id ? { ...s, ...p } : s)));
  const add = (type: SubTaskType) => { setSubs((x) => [...x, { id: nid(), type, label: "", link: "", usd: 0.5 }]); setPicker(false); };

  if (!authenticated && !DEMO) return <Empty title="Sign in to create a task" text="Any Shine account can launch a task campaign." action={<Button onClick={login}>Sign in</Button>} />;

  const published = (id: string, sig?: string) => {
    if (poll.current) clearInterval(poll.current);
    setIntent(null);
    setStatus({ kind: "success", title: "Your task is live", msg: <>Funds are secured in the Shine Vault and your campaign is now open.{sig && <> <a className="text-pink underline" href={`https://solscan.io/tx/${sig}`} target="_blank" rel="noopener noreferrer">View funding</a></>}</> });
    setTimeout(() => router.push(`/tasks/${id}`), 1800);
  };
  const check = async (it: Intent, signature?: string) => {
    const r = await api<{ paid: boolean; id: string; signature?: string }>("/api/tasks", { action: "fund_check", id: it.id, signature });
    if (r.paid) published(r.id, r.signature || signature); return r.paid;
  };
  const start = async () => {
    if (issues.length) return toast(issues[0], "err");
    setBusy(true);
    try { setIntent(await api<Intent>("/api/tasks", { action: "create", title, description: desc, subtasks: subs, limit: lim })); }
    catch (e) { toast(friendlyError(e), "err"); }
    setBusy(false);
  };
  const payShine = async () => {
    if (!intent) return;
    setBusy(true);
    try {
      const sig = await pay(intent.recipient, intent.lamports, { title: "Fund task campaign", subtitle: "Deposit to the Shine Vault", amount: `${fmtSol(intent.sol, 6)} SOL`, amountSub: `≈ ${fmtUsd(intent.usd)}`,
        rows: [["To", `Shine Vault · ${short(intent.recipient, 4)}`], ["Reward per user", fmtUsd(perUser)], ["Claim limit", String(lim)], ["Shine fee", "None"]], confirmLabel: "Confirm & fund", warning: "Funds stay in the Shine Vault and are paid out to approved claimants. Unused funds can be refunded by the Shine team." }, intent.reference);
      let ok = false;
      for (let i = 0; i < 6 && !ok; i++) { ok = await check(intent, sig).catch(() => false); if (!ok) await new Promise((r) => setTimeout(r, 2500)); }
      if (!ok) toast("Payment sent. Publishing as soon as it's confirmed…", "ok");
    } catch (e) { const k = errorKind(e); setStatus({ kind: k, title: k === "denied" ? "Funding cancelled" : "Funding failed", msg: friendlyError(e) }); }
    setBusy(false);
  };
  const external = () => { setMethod("external"); if (intent && !poll.current && !DEMO) poll.current = setInterval(() => { check(intent).catch(() => {}); }, 4000); };

  return (
    <div className="pb-32">
      <BackLink href="/tasks" label="Tasks" />
      <h1 className="mt-3 font-display text-3xl font-bold">Create a task</h1>
      <p className="mt-1 text-sm text-white/55">Reward people for joining, following and sharing. Fund once, the Shine team reviews every claim.</p>

      <div className="glass mt-5 space-y-3 rounded-3xl p-4">
        <input className={input} placeholder="Campaign title" maxLength={100} value={title} onChange={(e) => setTitle(e.target.value)} />
        <textarea className={`${input} min-h-[96px]`} placeholder="Describe what people need to do" maxLength={1500} value={desc} onChange={(e) => setDesc(e.target.value)} />
      </div>

      <div className="glass mt-4 rounded-3xl p-4">
        <h3 className="flex items-center gap-2 font-semibold"><IconTile name="task" size={32} />Sub-tasks <span className="text-xs font-normal text-white/45">· all required, proof needed</span></h3>
        <div className="mt-3 space-y-2.5">
          <AnimatePresence initial={false}>{subs.map((s, i) => {
            const meta = SUBTASK_TYPES.find((x) => x.type === s.type)!;
            return (
              <motion.div key={s.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} className="rounded-2xl border border-white/10 bg-white/[.03] p-3">
                <div className="flex items-center gap-2"><IconTile name={meta.icon} size={30} /><p className="min-w-0 flex-1 truncate text-sm font-semibold">{i + 1}. {meta.label}</p>
                  <button onClick={() => setSubs((x) => x.filter((y) => y.id !== s.id))} aria-label="Remove" className="rounded-full p-1.5 text-white/45 hover:bg-white/10 hover:text-red-300"><LIcon name="x" size={18} animate={false} /></button></div>
                <div className="mt-2.5 grid gap-2 sm:grid-cols-[1fr_120px]">
                  <input className={input} placeholder={meta.hint} value={s.link} onChange={(e) => upd(s.id, { link: e.target.value })} />
                  <label className="relative"><span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/45">$</span>
                    <input className={`${input} pl-7`} inputMode="decimal" aria-label="Reward in USD" value={String(s.usd)} onChange={(e) => upd(s.id, { usd: Number(e.target.value.replace(/[^\d.]/g, "")) || 0 })} /></label>
                </div>
                {(s.type === "custom" || s.label) && <input className={`${input} mt-2`} placeholder="Describe the task (e.g. Say hi in #general)" value={s.label} onChange={(e) => upd(s.id, { label: e.target.value })} />}
                <p className="mt-1.5 text-[11px] text-white/40">Proof: {meta.proof}</p>
              </motion.div>);
          })}</AnimatePresence>
        </div>
        {subs.length < MAX_SUBTASKS && <motion.button whileTap={{ scale: 0.98 }} onClick={() => setPicker(true)} className="mt-3 w-full rounded-2xl border border-dashed border-pink/40 py-3 text-sm font-semibold text-pink hover:bg-pink/5">+ Add sub-task</motion.button>}
      </div>

      <div className="glass mt-4 rounded-3xl p-4">
        <label className="text-sm font-semibold">Claim limit <span className="font-normal text-white/45">(max users)</span></label>
        <input className={`${input} mt-2`} inputMode="numeric" value={limit} onChange={(e) => setLimit(e.target.value.replace(/\D/g, "").slice(0, 5))} />
        <div className="mt-4 space-y-1.5 text-sm">
          <div className="flex justify-between text-white/60"><span>Reward per user</span><span>{fmtUsd(perUser)}</span></div>
          <div className="flex justify-between text-white/60"><span>× Claim limit</span><span>{lim || 0}</span></div>
          <div className="flex justify-between text-white/60"><span>Shine fee</span><span className="text-emerald-300">None</span></div>
          <div className="flex justify-between border-t border-white/10 pt-2 font-semibold"><span>Total to fund</span><span className="text-pink">{fmtUsd(total)}{price ? ` · ${fmtSol(total / price, 4)} SOL` : ""}</span></div>
          {total < TASK_MIN_USD && <p className="text-xs text-amber-200">Minimum campaign total is {fmtUsd(TASK_MIN_USD)}.</p>}
        </div>
      </div>

      {issues.length > 0 && subs.length > 0 && <p className="mt-3 text-sm text-amber-200">{issues[0]}</p>}
      <Button size="lg" className="mt-4 w-full" loading={busy && !intent} disabled={issues.length > 0} onClick={start}><LIcon name="shield" size={18} /> Fund & publish</Button>
      <p className="mt-2 text-center text-xs text-white/40">Only the Solana network fee applies. No Shine fee on publishing or claiming.</p>

      <BottomSheet open={picker} onClose={() => setPicker(false)} title="Add a sub-task">
        <div className="grid grid-cols-2 gap-2 pb-4">{SUBTASK_TYPES.map((t) => (
          <motion.button key={t.type} whileTap={{ scale: 0.97 }} onClick={() => add(t.type)} className="glass flex flex-col items-start gap-2 rounded-2xl p-3 text-left hover:border-pink/40">
            <IconTile name={t.icon} size={34} /><span className="text-sm font-semibold">{t.label}</span><span className="text-[11px] text-white/45">{t.proof}</span></motion.button>))}</div>
      </BottomSheet>

      <BottomSheet open={!!intent} onClose={() => { if (poll.current) clearInterval(poll.current); poll.current = null; setIntent(null); }} title="Fund your campaign">
        {intent && <div className="space-y-4 pb-4">
          <div className="rounded-3xl bg-pink/10 p-4 text-center ring-1 ring-pink/30">
            <p className="text-xs uppercase tracking-wider text-pink-soft">Deposit to the Shine Vault</p>
            <p className="mt-1 font-display text-3xl font-bold">{fmtSol(intent.sol, 6)} SOL</p>
            <p className="text-sm text-white/55">≈ {fmtUsd(intent.usd)} at ${intent.price.toFixed(2)}/SOL</p>
          </div>
          <div className="flex rounded-2xl bg-white/5 p-1 text-sm font-semibold">
            {(["shine", "external"] as const).map((m) => <button key={m} onClick={() => (m === "external" ? external() : setMethod("shine"))} className={`flex-1 rounded-xl py-2 ${method === m ? "grad text-white" : "text-white/60"}`}>{m === "shine" ? "Shine Wallet" : "External wallet"}</button>)}
          </div>
          {method === "shine" ? <Button size="lg" className="w-full" loading={busy} onClick={payShine}>Pay {fmtSol(intent.sol, 4)} SOL</Button> : <>
            <div className="mx-auto w-fit rounded-3xl bg-white p-3"><QRCodeSVG value={intent.url} size={190} /></div>
            <p className="text-center text-xs text-white/50">Scan with Phantom, Solflare or any Solana Pay wallet. We publish automatically once it&apos;s confirmed.</p>
            <ExternalWalletProvider><ExternalPay recipient={intent.recipient} lamports={intent.lamports} reference={intent.reference} label={`Pay ${fmtSol(intent.sol, 4)} SOL`} onSent={(sig) => { toast("Payment sent — confirming…", "ok"); setTimeout(() => check(intent, sig).catch(() => {}), 2500); }} /></ExternalWalletProvider>
          </>}
          <p className="break-all text-center font-mono text-[11px] text-white/35">Vault {intent.recipient}</p>
        </div>}
      </BottomSheet>
      <StatusOverlay kind={status?.kind ?? null} title={status?.title} message={status?.msg} onClose={() => setStatus(null)} />
    </div>
  );
}
