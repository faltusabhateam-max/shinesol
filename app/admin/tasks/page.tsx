"use client";
import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAdmin } from "@/components/admin";
import { Avatar, Button } from "@/components/ui";
import { BottomSheet } from "@/components/bottom-sheet";
import { IconTile, LIcon } from "@/components/line-icons";
import { SlotsBar, TaskStatus, subIcon } from "@/components/tasks-ui";
import { useToast } from "@/components/toast";
import { DEMO_QUEUE, DEMO_TASKS } from "@/lib/tasks-demo";
import { subLabel, type TaskCampaign, type TaskClaim } from "@/lib/tasks";
import { fmtSol, fmtUsd, timeAgo } from "@/lib/format";
import { LAMPORTS } from "@/lib/solana";

const DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === "1";

export default function AdminTasks() {
  const { call } = useAdmin();
  const toast = useToast();
  const [tab, setTab] = useState<"queue" | "campaigns">("queue");
  const [queue, setQueue] = useState<TaskClaim[] | null>(DEMO ? DEMO_QUEUE : null);
  const [tasks, setTasks] = useState<TaskCampaign[]>(DEMO ? DEMO_TASKS : []);
  const [busy, setBusy] = useState<string | null>(null);
  const [ask, setAsk] = useState<TaskClaim | null>(null);
  const [note, setNote] = useState("");
  const [zoom, setZoom] = useState<string | null>(null);
  const load = useCallback(() => { if (DEMO) return; call("/api/admin/tasks", { action: "list" }).then((r) => { setQueue(r.queue); setTasks(r.tasks); }).catch((e) => toast(e.message, "err")); }, [call, toast]);
  useEffect(() => { load(); }, [load]);
  const act = async (body: Record<string, any>, ok: string) => {
    setBusy(body.claimId || body.taskId);
    try { const r = await call("/api/admin/tasks", body); toast(ok, "ok"); if (r?.signature) toast("On-chain transfer confirmed", "ok"); setAsk(null); setNote(""); load(); }
    catch (e: any) { toast(e.message, "err"); }
    setBusy(null);
  };
  const taskOf = (id: string) => tasks.find((t) => t.id === id);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-pink">Shine team</p><h1 className="font-display text-3xl font-semibold">Tasks review</h1>
          <p className="text-sm text-white/50">Approve pays the reward from the vault instantly. Reject frees the slot. Ask to complete sends the claim back.</p></div>
        <div className="flex rounded-2xl bg-white/5 p-1 text-sm font-semibold">{(["queue", "campaigns"] as const).map((k) => <button key={k} onClick={() => setTab(k)} className={`rounded-xl px-4 py-2 ${tab === k ? "bg-pink text-white" : "text-white/60"}`}>{k === "queue" ? `Queue${queue ? ` · ${queue.length}` : ""}` : "Campaigns"}</button>)}</div>
      </div>

      {tab === "queue" && <div className="mt-5 grid gap-3 lg:grid-cols-2">
        {queue?.length === 0 && <p className="text-white/45">No claims waiting for review.</p>}
        <AnimatePresence>{queue?.map((c) => {
          const t = taskOf(c.taskId);
          return (
            <motion.div key={c.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }} className="glass rounded-3xl p-4">
              <div className="flex items-center gap-3"><Avatar avatar={c.avatar} size={40} />
                <div className="min-w-0 flex-1"><p className="truncate font-semibold">@{c.username}</p><p className="truncate text-xs text-white/45">{c.taskTitle} · submitted {timeAgo(c.submittedAt as any)}</p></div>
                <span className="shrink-0 text-sm font-semibold text-pink">{fmtSol((c.rewardLamports || 0) / LAMPORTS, 4)} SOL</span></div>
              <div className="mt-3 space-y-2">{(t?.subtasks || []).map((s) => {
                const p = (c.proofs || {})[s.id] || {};
                return (
                  <div key={s.id} className="flex items-start gap-3 rounded-2xl bg-white/[.03] p-2.5">
                    <IconTile name={subIcon(s.type)} size={30} />
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 text-sm font-semibold"><span className="truncate">{subLabel(s)}</span>
                        {p.auto ? <span className="shrink-0 rounded-full bg-emerald-400/15 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-200">Auto-verified</span> : <span className="shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase text-white/55">Manual</span>}</p>
                      {p.text && <p className="mt-0.5 break-all text-xs text-white/65">{/^https?:/.test(p.text) ? <a href={p.text} target="_blank" rel="noopener noreferrer" className="text-pink underline">{p.text}</a> : p.text}</p>}
                      <a href={s.link} target="_blank" rel="noopener noreferrer" className="text-[11px] text-white/35 hover:underline">{s.link}</a>
                    </div>
                    {p.image && <button onClick={() => setZoom(p.image!)}><img src={p.image} alt="Proof" className="h-14 w-14 rounded-xl object-cover ring-1 ring-white/10" /></button>}
                  </div>);
              })}</div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <Button size="sm" loading={busy === c.id} onClick={() => act({ action: "approve", claimId: c.id }, "Approved and paid")}><LIcon name="check" size={15} /> Approve</Button>
                <Button size="sm" variant="glass" onClick={() => { setAsk(c); setNote(""); }}>Ask to complete</Button>
                <Button size="sm" variant="glass" className="!text-red-300" onClick={() => act({ action: "reject", claimId: c.id }, "Rejected — slot reopened")}>Reject</Button>
              </div>
            </motion.div>);
        })}</AnimatePresence>
      </div>}

      {tab === "campaigns" && <div className="mt-5 grid gap-3 lg:grid-cols-2">{tasks.map((t) => {
        const remaining = (t.fundedLamports - (t.paidLamports || 0) - (t.refundedLamports || 0)) / LAMPORTS;
        return (
          <div key={t.id} className="glass rounded-3xl p-4">
            <div className="flex items-center gap-2"><p className="min-w-0 flex-1 truncate font-semibold">{t.title}</p><TaskStatus status={t.status} /></div>
            <p className="text-xs text-white/45">by @{t.creatorUsername} · {fmtUsd(t.rewardUsd)} × {t.limit} = {fmtUsd(t.totalUsd)}</p>
            <div className="mt-3"><SlotsBar used={t.claimed} total={t.limit} /></div>
            <div className="mt-3 grid grid-cols-4 gap-2 text-center text-xs">
              {[["Approved", t.approved], ["Rejected", t.rejected || 0], ["Paid", `${fmtSol((t.paidLamports || 0) / LAMPORTS, 3)}`], ["Left", `${fmtSol(remaining, 3)}`]].map(([k, v]) => <div key={k as string} className="rounded-xl bg-white/5 p-2"><p className="text-white/45">{k}</p><p className="font-semibold">{v}</p></div>)}
            </div>
            {t.status !== "cancelled" && remaining > 0 && <Button size="sm" variant="glass" className="mt-3 w-full" loading={busy === t.id} onClick={() => confirm(`Refund ${fmtSol(remaining, 4)} SOL to @${t.creatorUsername} and close the campaign?`) && act({ action: "refund", taskId: t.id }, "Remaining funds refunded")}>Close & refund remaining</Button>}
          </div>);
      })}</div>}

      <BottomSheet open={!!ask} onClose={() => setAsk(null)} title="Ask to complete">
        <div className="space-y-3 pb-4">
          <p className="text-sm text-white/60">Tell @{ask?.username} exactly what is missing. They can resubmit and keep their slot.</p>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder="e.g. Please repost the launch post — we couldn't find it." className="min-h-[100px] w-full rounded-2xl border border-white/10 bg-white/[.04] p-3 text-sm outline-none focus:border-pink/50" />
          <Button className="w-full" disabled={note.trim().length < 5} loading={!!busy} onClick={() => act({ action: "changes", claimId: ask!.id, note }, "Sent back to the user")}>Send back</Button>
        </div>
      </BottomSheet>
      <AnimatePresence>{zoom && <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setZoom(null)} className="fixed inset-0 z-[90] grid place-items-center bg-black/85 p-6"><img src={zoom} alt="Proof" className="max-h-full max-w-full rounded-2xl" /></motion.button>}</AnimatePresence>
    </div>
  );
}
