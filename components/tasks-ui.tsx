"use client";
import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { Avatar } from "./ui";
import { VerifiedBadge } from "./flags";
import { IconTile, LIcon } from "./line-icons";
import { ShareSheet } from "./share-sheet";
import { SUBTASK_TYPES, subLabel, type SubTask, type TaskCampaign } from "@/lib/tasks";
import { fmtSol, fmtUsd, timeAgo } from "@/lib/format";
import { LAMPORTS } from "@/lib/solana";

export const subIcon = (t: SubTask["type"]) => SUBTASK_TYPES.find((x) => x.type === t)?.icon || "task";

export function TaskStatus({ status }: { status: TaskCampaign["status"] }) {
  const m = { open: ["Open", "icon-grad neu-sm text-pink-soft border-pink/40", "bg-pink animate-pulse"], completed: ["Completed", "bg-emerald-400/15 text-emerald-200 border-emerald-300/30", "bg-emerald-300"],
    cancelled: ["Closed", "bg-white/10 text-white/60 border-white/15", "bg-white/50"], funding: ["Awaiting funding", "bg-amber-400/15 text-amber-200 border-amber-300/30", "bg-amber-300 animate-pulse"] }[status];
  return <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${m[1]}`}><span className={`h-1.5 w-1.5 rounded-full ${m[2]}`} />{m[0]}</span>;
}

export function SlotsBar({ used, total }: { used: number; total: number }) {
  const pct = Math.min(100, total ? (used / total) * 100 : 0);
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-white/55"><span className="flex items-center gap-1"><LIcon name="users" size={13} />{used}/{total} slots</span><span>{Math.round(pct)}%</span></div>
      <div className="h-2 overflow-hidden rounded-full neu-inset"><motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, ease: "easeOut" }} className="h-full rounded-full grad" /></div>
    </div>
  );
}

export function TaskCard({ t, index = 0 }: { t: TaskCampaign; index?: number }) {
  const [share, setShare] = useState(false);
  const url = typeof window !== "undefined" ? `${location.origin}/tasks/${t.id}` : `https://shinesol.vercel.app/tasks/${t.id}`;
  return (
    <motion.article initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index, 10) * 0.04 }} className="glass rounded-3xl px-4 pb-3 pt-3.5">
      <div className="flex items-center gap-3">
        <Avatar avatar={t.creatorAvatar} size={40} />
        <div className="min-w-0 flex-1">
          <p className="flex min-w-0 items-center gap-1 font-semibold leading-tight"><span className="min-w-0 truncate">{t.creatorName}</span><VerifiedBadge uid={t.creatorUid} /></p>
          <p className="truncate text-[13px] text-white/45">@{t.creatorUsername} · {timeAgo(t.createdAt as any) || "now"}</p>
        </div>
        <TaskStatus status={t.status} />
      </div>
      <Link href={`/tasks/${t.id}`} className="mt-3 block">
        <h3 className="font-display text-[17px] font-bold leading-snug">{t.title}</h3>
        <p className="mt-1 line-clamp-2 text-sm text-white/60">{t.description}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {t.subtasks.map((s) => <span key={s.id} className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-white/10 bg-white/[.04] px-2.5 py-1 text-xs text-white/75"><LIcon name={subIcon(s.type)} size={13} className="text-pink" /><span className="truncate">{subLabel(s)}</span></span>)}
        </div>
      </Link>
      <div className="mt-3 flex items-end gap-3">
        <div className="shrink-0 rounded-2xl bg-pink/12 px-3 py-2 ring-1 ring-pink/30">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-pink-soft">Reward</p>
          <p className="font-display text-lg font-bold leading-none">{fmtUsd(t.rewardUsd)}</p>
          <p className="mt-0.5 text-[11px] text-white/50">{fmtSol(t.rewardLamports / LAMPORTS, 4)} SOL</p>
        </div>
        <div className="min-w-0 flex-1"><SlotsBar used={t.claimed} total={t.limit} /></div>
      </div>
      <div className="mt-2.5 flex items-center justify-between border-t border-white/5 pt-2">
        <Link href={`/tasks/${t.id}`} className="text-sm font-semibold text-pink hover:underline">{t.status === "open" ? "Start task" : "View"}</Link>
        <button onClick={() => setShare(true)} aria-label="Share" className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm text-white/60 hover:bg-white/10 hover:text-white"><LIcon name="share" size={17} animate={false} /> Share</button>
      </div>
      <ShareSheet open={share} onClose={() => setShare(false)} url={url} title={`${t.title} — earn ${fmtUsd(t.rewardUsd)} on Shine`} />
    </motion.article>
  );
}

export function StatTile({ label, value, icon }: { label: string; value: string; icon: string }) {
  return <div className="glass flex items-center gap-3 rounded-2xl p-3"><IconTile name={icon} size={32} /><div className="min-w-0"><p className="text-[11px] uppercase tracking-wider text-white/45">{label}</p><p className="truncate font-semibold">{value}</p></div></div>;
}
