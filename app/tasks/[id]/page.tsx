"use client";
import { use, useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useSession } from "@/components/providers";
import { Avatar, BackLink, Button, Empty, FullLoader } from "@/components/ui";
import { VerifiedBadge } from "@/components/flags";
import { IconTile, LIcon } from "@/components/line-icons";
import { ShareSheet } from "@/components/share-sheet";
import { SlotsBar, StatTile, TaskStatus, subIcon } from "@/components/tasks-ui";
import { useApi } from "@/lib/client-api";
import { fileToDataUrl } from "@/lib/image";
import { DEMO_TASKS } from "@/lib/tasks-demo";
import { SUBTASK_TYPES, subLabel, type TaskCampaign, type TaskClaim } from "@/lib/tasks";
import { fmtSol, fmtUsd } from "@/lib/format";
import { LAMPORTS } from "@/lib/solana";
import { useToast } from "@/components/toast";
import { friendlyError } from "@/components/status";

const DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === "1";
type P = { text: string; image: string };

export default function TaskPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { authenticated, login, uid } = useSession();
  const api = useApi();
  const toast = useToast();
  const [t, setT] = useState<TaskCampaign | null | undefined>(undefined);
  const [claim, setClaim] = useState<TaskClaim | null>(null);
  const [proofs, setProofs] = useState<Record<string, P>>({});
  const [busy, setBusy] = useState(false);
  const [share, setShare] = useState(false);
  const load = useCallback(async () => {
    if (DEMO) {
      const d = DEMO_TASKS.find((x) => x.id === id) || null; setT(d);
      if (d && /claim=1/.test(location.search)) { setClaim({ id: "x", taskId: id, uid: "me", username: "ShineDemo", status: "reserved", proofs: {}, createdAt: null }); setProofs({ a: { text: "@shinedemo", image: "" }, b: { text: "@shinedemo", image: "/media/how-it-works-poster.jpg" }, c: { text: "", image: "" } }); }
      if (d && /changes=1/.test(location.search)) setClaim({ id: "x", taskId: id, uid: "me", username: "ShineDemo", status: "changes", proofs: {}, note: "Please repost the launch post — we couldn't find your repost.", createdAt: null });
      return;
    }
    const r = await fetch(`/api/tasks?id=${encodeURIComponent(id)}`).then((r) => r.json()).catch(() => ({}));
    setT(r.task || null);
    if (authenticated) api<{ claim: TaskClaim | null }>("/api/tasks", { action: "my_claim", id }).then((x) => setClaim(x.claim)).catch(() => {});
  }, [id, authenticated, api]);
  useEffect(() => { load(); }, [load]);

  if (t === undefined) return <FullLoader />;
  if (!t) return <Empty title="Task not found" text="This campaign doesn't exist or isn't published yet." />;
  const mineCampaign = uid && t.creatorUid === uid;
  const editable = claim && (claim.status === "reserved" || claim.status === "changes");
  const setP = (sid: string, p: Partial<P>) => setProofs((x) => ({ ...x, [sid]: { ...({ text: "", image: "" } as P), ...x[sid], ...p } }));
  const reserve = async () => {
    if (!authenticated) return login();
    setBusy(true);
    try { const r = await api<{ claim: TaskClaim }>("/api/tasks", { action: "claim", id }); setClaim(r.claim); toast("Slot reserved — complete every task and submit proof", "ok"); }
    catch (e) { toast(friendlyError(e), "err"); load(); }
    setBusy(false);
  };
  const submit = async () => {
    const missing = t.subtasks.find((s) => !proofs[s.id]?.text?.trim() && !proofs[s.id]?.image);
    if (missing) return toast(`Add proof for “${subLabel(missing)}”`, "err");
    setBusy(true);
    try { await api("/api/tasks", { action: "submit", id, proofs }); toast("Submitted for review by the Shine team", "ok"); load(); }
    catch (e) { toast(friendlyError(e), "err"); }
    setBusy(false);
  };
  const pick = async (sid: string, f?: File) => {
    if (!f) return;
    try { const { dataUrl } = await fileToDataUrl(f, 1100, 300_000); setP(sid, { image: dataUrl }); } catch (e) { toast(friendlyError(e), "err"); }
  };
  const url = typeof window !== "undefined" ? location.href.split("?")[0] : "";

  return (
    <div className="pb-32">
      <BackLink href="/tasks" label="Tasks" />
      <div className="glass mt-3 rounded-3xl p-4">
        <div className="flex items-center gap-3"><Avatar avatar={t.creatorAvatar} size={44} />
          <div className="min-w-0 flex-1"><p className="flex min-w-0 items-center gap-1 font-semibold"><span className="truncate">{t.creatorName}</span><VerifiedBadge uid={t.creatorUid} /></p><p className="truncate text-sm text-white/45">@{t.creatorUsername}</p></div>
          <TaskStatus status={t.status} /></div>
        <h1 className="mt-3 font-display text-2xl font-bold leading-tight">{t.title}</h1>
        <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-white/65">{t.description}</p>
        <div className="mt-4 flex items-end gap-3">
          <div className="shrink-0 rounded-2xl bg-pink/12 px-3 py-2 ring-1 ring-pink/30"><p className="text-[10px] font-semibold uppercase tracking-wider text-pink-soft">You earn</p><p className="font-display text-xl font-bold leading-none">{fmtUsd(t.rewardUsd)}</p><p className="text-[11px] text-white/50">{fmtSol(t.rewardLamports / LAMPORTS, 4)} SOL</p></div>
          <div className="min-w-0 flex-1"><SlotsBar used={t.claimed} total={t.limit} /></div>
        </div>
        <div className="mt-3 flex justify-end"><button onClick={() => setShare(true)} className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-white/65 hover:bg-white/10"><LIcon name="share" size={16} animate={false} /> Share</button></div>
      </div>

      {mineCampaign && <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatTile label="Claims" value={`${t.claimed}/${t.limit}`} icon="users" /><StatTile label="Approved" value={String(t.approved)} icon="check" />
        <StatTile label="Reward" value={fmtUsd(t.rewardUsd)} icon="coins" /><StatTile label="Budget" value={fmtUsd(t.totalUsd)} icon="receipt" />
      </div>}

      {claim?.status === "changes" && <div className="mt-4 flex gap-3 rounded-3xl border border-amber-300/30 bg-amber-400/10 p-4 text-sm"><LIcon name="bolt" size={20} className="text-amber-200" /><div><p className="font-semibold text-amber-100">The Shine team asked you to finish a task</p><p className="mt-0.5 text-amber-100/80">{claim.note}</p></div></div>}
      {claim?.status === "submitted" && <div className="mt-4 flex items-center gap-3 rounded-3xl bg-white/5 p-4 text-sm"><LIcon name="clock" size={20} className="text-pink" />Your proof is under review by the Shine team. Approved rewards are paid instantly to your Shine Wallet.</div>}
      {claim?.status === "approved" && <div className="mt-4 flex items-center gap-3 rounded-3xl bg-emerald-400/10 p-4 text-sm text-emerald-100"><LIcon name="check" size={20} />Approved — {fmtSol((t.rewardLamports) / LAMPORTS, 4)} SOL was sent to your Shine Wallet.{claim.payoutTx && <a className="ml-auto text-pink underline" href={`https://solscan.io/tx/${claim.payoutTx}`} target="_blank" rel="noopener noreferrer">Solscan</a>}</div>}
      {claim?.status === "rejected" && <div className="mt-4 flex items-center gap-3 rounded-3xl bg-red-500/10 p-4 text-sm text-red-100"><LIcon name="x" size={20} animate={false} />Your claim was not approved.{claim.note ? ` ${claim.note}` : ""}</div>}

      <h2 className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-white/45">Tasks · all required</h2>
      <div className="mt-2 space-y-2.5">{t.subtasks.map((s, i) => {
        const meta = SUBTASK_TYPES.find((x) => x.type === s.type)!;
        const p = proofs[s.id];
        const done = !!(p?.text?.trim() || p?.image);
        return (
          <motion.div key={s.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className={`glass rounded-3xl p-4 ${done && editable ? "border-pink/40" : ""}`}>
            <div className="flex items-center gap-3"><IconTile name={subIcon(s.type)} size={36} />
              <div className="min-w-0 flex-1"><p className="truncate font-semibold">{subLabel(s)}</p><p className="text-xs text-white/45">{meta.label} · {fmtUsd(s.usd)}</p></div>
              {done && editable && <LIcon name="check" size={20} className="text-pink" />}
              {s.link && <a href={s.link} target="_blank" rel="noopener noreferrer" className="flex shrink-0 items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold hover:bg-white/15">Open <LIcon name="external" size={13} animate={false} /></a>}
            </div>
            {editable && <div className="mt-3 space-y-2">
              <input value={p?.text || ""} onChange={(e) => setP(s.id, { text: e.target.value })} placeholder={meta.proof} className="w-full rounded-2xl border border-white/10 bg-white/[.04] px-3.5 py-2.5 text-sm outline-none placeholder:text-white/30 focus:border-pink/50" />
              <label className="flex cursor-pointer items-center gap-2 rounded-2xl border border-dashed border-white/15 px-3.5 py-2.5 text-sm text-white/60 hover:border-pink/40">
                {p?.image ? <img src={p.image} alt="" className="h-10 w-10 rounded-lg object-cover" /> : <LIcon name="file" size={18} />}
                {p?.image ? "Screenshot attached · tap to replace" : "Attach screenshot"}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => pick(s.id, e.target.files?.[0])} /></label>
            </div>}
          </motion.div>);
      })}</div>

      {!mineCampaign && <div className="mt-5">
        {!claim || (claim.status === "rejected" && (claim as any).expired) ? <Button size="lg" className="w-full" loading={busy} disabled={t.status !== "open"} onClick={reserve}>{t.status === "open" ? <><LIcon name="gift" size={18} /> Claim a slot</> : t.status === "completed" ? "Completed — all slots taken" : "Campaign closed"}</Button>
          : editable ? <Button size="lg" className="w-full" loading={busy} onClick={submit}><LIcon name="proof" size={18} /> Submit proof for review</Button> : null}
        <p className="mt-2 text-center text-xs text-white/40">First come, first served. A reserved slot is held for 6 hours. Rewards are paid in full — no Shine fee.</p>
      </div>}
      <ShareSheet open={share} onClose={() => setShare(false)} url={url} title={`${t.title} — earn ${fmtUsd(t.rewardUsd)} on Shine`} />
    </div>
  );
}
