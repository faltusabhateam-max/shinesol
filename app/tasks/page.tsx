"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession } from "@/components/providers";
import { Button, Empty, PageTitle, Segmented, StarLoader } from "@/components/ui";
import { StatTile, TaskCard, TaskStatus } from "@/components/tasks-ui";
import { LIcon } from "@/components/line-icons";
import { useApi } from "@/lib/client-api";
import { DEMO_TASKS } from "@/lib/tasks-demo";
import type { TaskCampaign, TaskClaim } from "@/lib/tasks";
import { fmtSol, fmtUsd } from "@/lib/format";
import { LAMPORTS } from "@/lib/solana";

const DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === "1";
const CLAIM_LABEL: Record<string, string> = { reserved: "Slot reserved · submit proof", submitted: "Under review by Shine", changes: "Action needed", approved: "Paid", rejected: "Rejected" };

export default function TasksPage() {
  const { authenticated, login } = useSession();
  const api = useApi();
  const [tab, setTab] = useState<"explore" | "mine">("explore");
  const [tasks, setTasks] = useState<TaskCampaign[] | null>(null);
  const [mine, setMine] = useState<{ claims: TaskClaim[]; campaigns: (TaskCampaign & { fundedLamports: number })[] } | null>(null);
  useEffect(() => {
    if (DEMO) { setTasks(DEMO_TASKS); return; }
    fetch("/api/tasks").then((r) => r.json()).then((j) => setTasks(j.tasks || [])).catch(() => setTasks([]));
  }, []);
  useEffect(() => {
    if (tab !== "mine" || !authenticated) return;
    if (DEMO) { setMine({ claims: [{ id: "x", taskId: "demo-t1", uid: "me", username: "ShineDemo", status: "submitted", proofs: {}, createdAt: null, taskTitle: DEMO_TASKS[0].title, rewardLamports: DEMO_TASKS[0].rewardLamports }], campaigns: [DEMO_TASKS[2] as any] }); return; }
    api<any>("/api/tasks", { action: "mine" }).then(setMine).catch(() => setMine({ claims: [], campaigns: [] }));
  }, [tab, authenticated, api]);
  return (
    <div className="pb-28">
      <PageTitle sub="Complete quick social tasks and earn SOL. Rewards are paid by the Shine Vault after team review." right={<Link href="/tasks/new"><Button size="sm"><LIcon name="spark" size={16} /> Create</Button></Link>}>Tasks</PageTitle>
      <Segmented value={tab} onChange={setTab} options={[{ value: "explore", label: "Explore" }, { value: "mine", label: "My tasks" }]} />
      <div className="mt-4 space-y-3">
        {tab === "explore" && (tasks == null ? <div className="py-16"><StarLoader /></div>
          : tasks.length ? tasks.map((t, i) => <TaskCard key={t.id} t={t} index={i} />)
          : <Empty title="No tasks yet" text="Be the first to launch a task campaign." action={<Link href="/tasks/new"><Button>Create a task</Button></Link>} />)}
        {tab === "mine" && (!authenticated ? <Empty title="Sign in to see your tasks" action={<Button onClick={login}>Sign in</Button>} />
          : mine == null ? <div className="py-16"><StarLoader /></div> : <>
            <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">My claims</h3>
            {mine.claims.length ? mine.claims.map((c) => (
              <Link key={c.id} href={`/tasks/${c.taskId}`} className="glass flex items-center gap-3 rounded-2xl p-3.5">
                <LIcon name={c.status === "approved" ? "check" : c.status === "rejected" ? "x" : c.status === "changes" ? "bolt" : "clock"} size={22} className={c.status === "approved" ? "text-emerald-300" : c.status === "rejected" ? "text-red-300" : "text-pink"} />
                <div className="min-w-0 flex-1"><p className="truncate font-semibold">{c.taskTitle}</p><p className="text-xs text-white/50">{CLAIM_LABEL[c.status]}{(c as any).notice ? ` · ${(c as any).notice}` : ""}</p></div>
                <span className="shrink-0 text-sm font-semibold text-pink">{fmtSol((c.rewardLamports || 0) / LAMPORTS, 4)} SOL</span>
              </Link>)) : <p className="text-sm text-white/45">You haven&apos;t claimed any tasks yet.</p>}
            <h3 className="pt-3 text-xs font-semibold uppercase tracking-[0.18em] text-white/45">My campaigns</h3>
            {mine.campaigns.length ? mine.campaigns.map((t) => {
              const spent = (t.paidLamports || 0) / LAMPORTS, remaining = (t.fundedLamports - (t.paidLamports || 0) - (t.refundedLamports || 0)) / LAMPORTS;
              return (
                <Link key={t.id} href={`/tasks/${t.id}`} className="glass block rounded-3xl p-4">
                  <div className="flex items-center gap-2"><p className="min-w-0 flex-1 truncate font-semibold">{t.title}</p><TaskStatus status={t.status} /></div>
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    <StatTile label="Claims" value={`${t.claimed}/${t.limit}`} icon="users" /><StatTile label="Approved" value={String(t.approved)} icon="check" />
                    <StatTile label="Rejected" value={String(t.rejected || 0)} icon="x" /><StatTile label="Spent" value={`${fmtSol(spent, 4)} SOL`} icon="coins" />
                    <StatTile label="Remaining" value={`${fmtSol(remaining, 4)} SOL`} icon="wallet" /><StatTile label="Budget" value={fmtUsd(t.totalUsd)} icon="receipt" />
                  </div>
                </Link>);
            }) : <p className="text-sm text-white/45">No campaigns yet.</p>}
          </>)}
      </div>
    </div>
  );
}
