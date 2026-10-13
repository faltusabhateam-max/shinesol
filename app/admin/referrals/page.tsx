"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useAdmin } from "@/components/admin";
import { Button } from "@/components/ui";
import { useToast } from "@/components/toast";
import { StatusBadge, CopyIcon, GiftIcon } from "@/components/referral";
import { fmtSol, fmtUsd, short, timeAgo } from "@/lib/format";
import { REF_ACTIVE_DAYS, REF_TIERS, REF_WINDOW_DAYS, type RefStatus } from "@/lib/config";

type Claim = { id: string; uid: string; username: string; tier: string; kind: "badge" | "usd"; at: number; usd: number; status: RefStatus; reason: string | null; lamports: number; price: number | null; funded: boolean; tx: string | null; requestedAt: string | null; qualifiedAtRequest: number | null; totalAtRequest: number | null; payoutError: string | null; fundTx: string | null };
type Row = { uid: string; username: string; attachedAt: string; verified: boolean; activeDays: number; active: boolean; qualified: boolean; deactivated: boolean };
type Detail = { uid: string; username: string; total: number; qualified: number; referrals: Row[] };
const FILTERS = ["pending", "approved", "paid", "rejected", "all"] as const;

export default function AdminReferrals() {
  const { call } = useAdmin();
  const toast = useToast();
  const [data, setData] = useState<{ claims: Claim[]; price: number | null; vault: string; balance: number | null } | null>(null);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("pending");
  const [detail, setDetail] = useState<Detail | null>(null);
  const [lookup, setLookup] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [fundTx, setFundTx] = useState<Record<string, string>>({});

  const load = useCallback(() => call("/api/admin/referrals", { action: "list" }).then(setData).catch((e) => toast(e.message, "err")), [call, toast]);
  useEffect(() => { load(); }, [load]);
  const openUser = async (q: { uid?: string; username?: string }) => { try { setDetail(await call("/api/admin/referrals", { action: "user", ...q })); } catch (e: any) { toast(e.message, "err"); } };
  const run = async (c: Claim, action: string, extra: Record<string, any> = {}, ok = "Done") => {
    setBusy(c.id + action);
    try { await call("/api/admin/referrals", { action, id: c.id, ...extra }); toast(ok, "ok"); await load(); } catch (e: any) { toast(e.message, "err"); } finally { setBusy(null); }
  };
  const reject = (c: Claim) => { const reason = window.prompt("Rejection reason (shown to the user):"); if (reason?.trim()) run(c, "reject", { reason }, "Request rejected"); };

  const claims = (data?.claims || []).filter((c) => filter === "all" ? true : filter === "pending" ? ["requested", "review"].includes(c.status) : c.status === filter);
  const tierLabel = (id: string) => REF_TIERS.find((t) => t.id === id)?.label || id;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 font-display text-2xl font-semibold"><span className="text-pink"><GiftIcon size={24} /></span>Referrals</h1>
          <p className="text-sm text-white/50">Qualified = verified by the team + active {REF_ACTIVE_DAYS}/{REF_WINDOW_DAYS} days. Review requests, grant badges, fund and open SOL claims.</p>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); if (lookup.trim()) openUser({ username: lookup.trim() }); }} className="flex w-full gap-2 sm:w-auto">
          <input value={lookup} onChange={(e) => setLookup(e.target.value)} placeholder="Look up @username" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none focus:border-pink/50 sm:w-56" />
          <Button size="sm" type="submit">Referrals</Button>
        </form>
      </div>

      {/* Vault funding */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass-strong mb-5 rounded-2xl p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pink">Vault funding</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <code className="min-w-0 max-w-full truncate rounded-lg bg-black/50 px-2 py-1 text-xs text-white/80">{data?.vault || "…"}</code>
          <button type="button" onClick={() => data && navigator.clipboard.writeText(data.vault).then(() => toast("Vault address copied", "ok"))} className="grid h-8 w-8 place-items-center rounded-lg bg-white/5 text-white/70 hover:text-pink" aria-label="Copy vault address"><CopyIcon size={16} /></button>
          <span className="text-xs text-white/50">Balance: <span className="text-white">{data?.balance != null ? `${fmtSol(data.balance, 4)} SOL` : "—"}</span> · SOL: <span className="text-white">{data?.price ? fmtUsd(data.price) : "—"}</span></span>
        </div>
        <ol className="mt-3 grid gap-1 text-xs text-white/55 sm:grid-cols-2">
          <li>1. Review the user&apos;s referral list and move the request to review.</li>
          <li>2. From the team Privy wallet, send the SOL amount shown on the request to the vault above.</li>
          <li>3. Click “Mark funded” (paste the funding tx, optional). The SOL amount is locked at the current price.</li>
          <li>4. Click “Open claim”. The user&apos;s Claim button activates and pays from the vault server-side.</li>
        </ol>
      </motion.div>

      <div className="mb-4 flex gap-1 overflow-x-auto">
        {FILTERS.map((f) => (
          <button key={f} type="button" onClick={() => setFilter(f)} className={`relative rounded-xl px-3 py-1.5 text-sm font-semibold capitalize ${filter === f ? "text-white" : "text-white/50 hover:text-white"}`}>
            {filter === f && <motion.span layoutId="ref-filter" className="absolute inset-0 rounded-xl bg-pink/15 ring-1 ring-pink/40" />}<span className="relative">{f}</span>
          </button>
        ))}
      </div>

      {!data ? <div className="skeleton h-32 rounded-2xl" /> : !claims.length ? <p className="glass rounded-2xl p-6 text-center text-white/50">No {filter === "all" ? "" : filter} referral requests.</p> : (
        <div className="grid gap-3 lg:grid-cols-2">{claims.map((c, i) => {
          const sol = c.lamports ? c.lamports / 1e9 : data.price && c.usd ? c.usd / data.price : 0;
          return (
            <motion.div key={c.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="glass rounded-2xl p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <Link href={`/u/${c.username}`} className="font-semibold hover:text-pink">@{c.username}</Link>
                  <p className="text-xs text-white/50">{tierLabel(c.tier)} · {c.at} required · {timeAgo(c.requestedAt ? new Date(c.requestedAt) : null)}</p>
                  <p className="text-xs text-white/50">At request: {c.qualifiedAtRequest ?? "?"} qualified / {c.totalAtRequest ?? "?"} total</p>
                </div>
                <StatusBadge s={c.status} badge={c.kind === "badge"} />
              </div>
              {c.kind === "usd" && <p className="mt-2 text-xs text-white/60">Reward: {fmtUsd(c.usd)} ≈ <span className="text-white">{fmtSol(sol, 4)} SOL</span>{c.funded ? <span className="ml-1 rounded-full bg-emerald-400/10 px-1.5 text-emerald-300">funded @ {fmtUsd(c.price || 0)}</span> : " (live price)"}{c.fundTx && <> · <a className="text-pink underline" target="_blank" rel="noopener noreferrer" href={`https://solscan.io/tx/${c.fundTx}`}>fund tx</a></>}</p>}
              {c.tx && <p className="mt-1 text-xs">Payout: <a className="text-pink underline" target="_blank" rel="noopener noreferrer" href={`https://solscan.io/tx/${c.tx}`}>{short(c.tx, 6)}</a></p>}
              {c.reason && <p className="mt-1 text-xs text-red-300">Reason: {c.reason}</p>}
              {c.payoutError && <p className="mt-1 text-xs text-amber-300">Payout error: {c.payoutError}</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" variant="glass" onClick={() => openUser({ uid: c.uid })}>View referrals</Button>
                {c.status === "requested" && <Button size="sm" variant="glass" loading={busy === c.id + "review"} onClick={() => run(c, "review", {}, "Moved to review")}>Start review</Button>}
                {c.kind === "badge" && ["requested", "review"].includes(c.status) && <Button size="sm" loading={busy === c.id + "grant_badge"} onClick={() => run(c, "grant_badge", {}, "Permanent badge granted")}>Grant badge</Button>}
                {c.kind === "usd" && c.status === "review" && !c.funded && <>
                  <input value={fundTx[c.id] || ""} onChange={(e) => setFundTx({ ...fundTx, [c.id]: e.target.value })} placeholder="Funding tx (optional)" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/40 px-2 py-1 text-xs outline-none" />
                  <Button size="sm" loading={busy === c.id + "mark_funded"} onClick={() => run(c, "mark_funded", { fundTx: fundTx[c.id] || "" }, "Marked funded")}>Mark funded</Button></>}
                {c.kind === "usd" && c.status === "review" && c.funded && <Button size="sm" loading={busy === c.id + "open_claim"} onClick={() => run(c, "open_claim", {}, "Claim opened for the user")}>Open claim</Button>}
                {c.payoutError && <Button size="sm" variant="ghost" onClick={() => window.confirm("Only unlock after confirming on Solscan that no payout landed. Continue?") && run(c, "unlock_payout", {}, "Payout unlocked")}>Unlock payout</Button>}
                {!["paid", "rejected"].includes(c.status) && <Button size="sm" variant="danger" onClick={() => reject(c)}>Reject</Button>}
              </div>
            </motion.div>
          );
        })}</div>
      )}

      <AnimatePresence>
        {detail && (
          <motion.div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-2 backdrop-blur-sm sm:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDetail(null)}>
            <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} onClick={(e) => e.stopPropagation()} className="glass-strong max-h-[85dvh] w-full max-w-2xl overflow-y-auto rounded-3xl p-4 sm:p-5">
              <div className="flex items-center justify-between gap-2">
                <div><p className="font-display text-lg font-semibold">@{detail.username}</p><p className="text-xs text-white/50">{detail.total} total · <span className="text-pink">{detail.qualified} qualified</span></p></div>
                <Button size="sm" variant="ghost" onClick={() => setDetail(null)}>Close</Button>
              </div>
              {!detail.referrals.length ? <p className="mt-4 text-sm text-white/50">No referrals.</p> : (
                <ul className="mt-3 divide-y divide-white/5">{detail.referrals.map((r) => (
                  <li key={r.uid} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <div className="min-w-0"><Link href={`/u/${r.username}`} className="text-sm font-semibold hover:text-pink">@{r.username}</Link><p className="text-[11px] text-white/45">joined {timeAgo(r.attachedAt ? new Date(r.attachedAt) : null)} · active {r.activeDays}/{REF_WINDOW_DAYS}d</p></div>
                    <div className="flex flex-wrap gap-1 text-[10px] font-semibold">
                      <span className={`rounded-full px-2 py-0.5 ${r.verified ? "bg-sky-400/10 text-sky-300" : "bg-white/5 text-white/45"}`}>{r.verified ? "Verified" : "Unverified"}</span>
                      <span className={`rounded-full px-2 py-0.5 ${r.active ? "bg-sky-400/10 text-sky-300" : "bg-white/5 text-white/45"}`}>{r.active ? "Active" : "Inactive"}</span>
                      {r.deactivated && <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-red-300">Deactivated</span>}
                      <span className={`rounded-full px-2 py-0.5 ${r.qualified ? "bg-emerald-400/15 text-emerald-300" : "bg-red-500/10 text-red-300"}`}>{r.qualified ? "Qualified" : "Not qualified"}</span>
                    </div>
                  </li>
                ))}</ul>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
