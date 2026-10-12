"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { currentPeriod, type EscrowPlan } from "@/lib/escrow";
import { fmtUsd } from "@/lib/format";
import { PeriodChip, VaultIcon } from "./escrow";

export const DEMO_PLANS: EscrowPlan[] = [
  { id: "demo-project", chatId: "demo-project", projectUid: "me", creatorUid: "c", projectName: "Shine", creatorUsername: "Zorveny", usd: 100, freq: "weekly", status: "active", creatorWallet: "", periods: [{ n: 3, usd: 100, status: "due" }] },
  { id: "d2", chatId: "demo-project", projectUid: "me", creatorUid: "c2", projectName: "Shine", creatorUsername: "solwriter", usd: 450, freq: "monthly", status: "active", creatorWallet: "", periods: [{ n: 1, usd: 450, status: "funded" }] },
  { id: "d3", chatId: "demo-project", projectUid: "me", creatorUid: "c3", projectName: "Shine", creatorUsername: "memequeen", usd: 60, freq: "weekly", status: "active", creatorWallet: "", periods: [{ n: 5, usd: 60, status: "awaiting_funding" }], offRequest: { status: "pending", reason: "", requestedAt: null } },
  { id: "d4", chatId: "demo-project", projectUid: "x", creatorUid: "me", projectName: "Orbit Labs", creatorUsername: "ShineDemo", usd: 200, freq: "monthly", status: "off", creatorWallet: "", periods: [{ n: 2, usd: 200, status: "released" }] },
];

export function EscrowRow({ p, uid, i = 0 }: { p: EscrowPlan; uid: string | null; i?: number }) {
  const cur = currentPeriod(p);
  const project = p.projectUid === uid || p.projectUid === "me";
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
      <Link href={`/chat/${p.chatId}?escrow=1`} className="flex items-center gap-3 px-4 py-3.5 transition hover:bg-white/[.03]">
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ring-1 ${p.status === "active" ? "bg-emerald-400/10 text-emerald-200 ring-emerald-300/30" : p.status === "off" ? "bg-white/5 text-white/50 ring-white/15" : "bg-amber-400/10 text-amber-200 ring-amber-300/30"}`}><VaultIcon /></span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold">{project ? `@${p.creatorUsername}` : p.projectName}<span className="ml-1.5 text-xs font-normal text-white/45">{project ? "· you pay" : "· pays you"}</span></p>
          <p className="truncate text-xs text-white/50">{fmtUsd(p.usd)} {p.freq} · {p.status === "active" ? "Auto-payment on" : p.status === "off" ? "Turned off" : "Not enabled"}{p.offRequest?.status === "pending" ? " · Off request pending" : ""}</p>
        </div>
        {cur && p.status !== "draft" ? <PeriodChip status={cur.status} /> : <span className="text-xs text-white/40">Draft</span>}
      </Link>
    </motion.div>
  );
}
