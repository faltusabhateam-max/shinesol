"use client";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { fmtSol, fmtUsd, short } from "@/lib/format";
import { StarLoader } from "@/components/ui";

type Tot = { sol: number; usd: number };
type Stats = { updatedAt: string; price: number | null; totals: Record<string, Tot> & { verifySubscriptions: number; txCount: number }; vault: { address: string | null; balance: number | null }; users: number; projects: number; series: { day: string; fees: number; verify: number; affiliate: number; paid: number; revenue: number; cumulative: number; cumulativePaid: number }[] };
type Row = { id: string; at: string; type: string; source: string; sol: number; usd: number | null; signature: string; label: string };
const TYPE: Record<string, [string, string]> = {
  fee: ["Fee", "bg-pink/15 text-pink"], payout: ["Paid to creator", "bg-emerald-400/15 text-emerald-300"], escrow_fund: ["Escrow funded", "bg-sky-400/15 text-sky-300"],
  escrow_refund: ["Escrow refund", "bg-amber-400/15 text-amber-200"], verify: ["Verified plan", "bg-fuchsia-400/15 text-fuchsia-300"], affiliate: ["Affiliate", "bg-violet-400/15 text-violet-300"], dispute: ["Dispute resolution", "bg-red-400/15 text-red-200"],
};

function Stat({ label, sol, usd, sub, i }: { label: string; sol?: number; usd?: number | null; sub?: string; i: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="glass rounded-3xl p-4">
      <p className="text-xs text-white/45">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold tabular-nums">{sol != null ? `${fmtSol(sol, 3)} SOL` : sub}</p>
      {sol != null && <p className="text-xs text-white/50">{usd != null ? `≈ ${fmtUsd(usd)}` : "—"}</p>}
    </motion.div>
  );
}

function LineChart({ data, keys }: { data: number[][]; keys: { label: string; color: string }[] }) {
  const W = 600, H = 180, n = data[0]?.length || 0;
  const max = Math.max(1e-9, ...data.flat());
  const pts = (d: number[]) => d.map((v, i) => `${(i / Math.max(1, n - 1)) * W},${H - (v / max) * (H - 16) - 4}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-44 w-full" preserveAspectRatio="none">
      {[0.25, 0.5, 0.75].map((y) => <line key={y} x1="0" x2={W} y1={H * y} y2={H * y} stroke="rgba(255,255,255,.06)" />)}
      {data.map((d, k) => (
        <g key={k}>
          <motion.polygon points={`0,${H} ${pts(d)} ${W},${H}`} fill={keys[k].color} opacity={0.08} initial={{ opacity: 0 }} animate={{ opacity: 0.08 }} />
          <motion.polyline points={pts(d)} fill="none" stroke={keys[k].color} strokeWidth="2.5" vectorEffect="non-scaling-stroke" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.2 }} />
        </g>
      ))}
    </svg>
  );
}
function Bars({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(1e-9, ...data);
  return (
    <div className="flex h-44 items-end gap-[2px]">
      {data.map((v, i) => <motion.div key={i} title={`${fmtSol(v, 5)} SOL`} className="flex-1 rounded-t-sm" style={{ background: color, minHeight: v > 0 ? 3 : 1, opacity: v > 0 ? 1 : 0.15 }} initial={{ height: 0 }} animate={{ height: `${(v / max) * 100}%` }} transition={{ delay: i * 0.01, type: "spring", stiffness: 120, damping: 18 }} />)}
    </div>
  );
}
function ChartCard({ title, children, legend, range }: { title: string; children: React.ReactNode; legend?: { label: string; color: string }[]; range?: [string, string] }) {
  return (
    <div className="glass rounded-3xl p-4">
      <div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-semibold">{title}</h3>
        {legend && <div className="flex gap-3 text-[11px] text-white/50">{legend.map((l) => <span key={l.label} className="flex items-center gap-1"><i className="h-2 w-2 rounded-full" style={{ background: l.color }} />{l.label}</span>)}</div>}</div>
      {children}
      {range && <div className="mt-2 flex justify-between text-[10px] text-white/35"><span>{range[0]}</span><span>{range[1]}</span></div>}
    </div>
  );
}

export function RevenueDashboard() {
  const [s, setS] = useState<Stats | null>(null);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [filter, setFilter] = useState("all");
  const [err, setErr] = useState(false);
  useEffect(() => {
    const load = () => {
      fetch("/api/public/stats").then((r) => r.json()).then((j) => (j.totals ? setS(j) : setErr(true))).catch(() => setErr(true));
      fetch("/api/public/ledger?limit=300").then((r) => r.json()).then((j) => setRows(j.rows || [])).catch(() => setRows([]));
    };
    load(); const t = setInterval(load, 60_000); return () => clearInterval(t);
  }, []);
  const series = useMemo(() => (s?.series || []).slice(-60), [s]);
  if (err) return <p className="glass rounded-3xl p-6 text-center text-white/60">Live stats are temporarily unavailable. Please try again shortly.</p>;
  if (!s) return <div className="grid place-items-center py-20"><StarLoader label="Loading live data…" /></div>;
  const t = s.totals, p = s.price;
  const range: [string, string] | undefined = series.length ? [series[0].day, series[series.length - 1].day] : undefined;
  const shown = (rows || []).filter((r) => filter === "all" || r.type === filter);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Stat i={0} label="Total revenue (fees + plans)" sol={t.revenue.sol} usd={t.revenue.usd} />
        <Stat i={1} label="Paid to creators" sol={t.paidToCreators.sol} usd={t.paidToCreators.usd} />
        <Stat i={2} label="Live Shine vault balance" sol={s.vault.balance ?? 0} usd={s.vault.balance != null && p ? s.vault.balance * p : null} />
        <Stat i={3} label={`Verified revenue · ${t.verifySubscriptions} plans`} sol={t.verify.sol} usd={t.verify.usd} />
        <Stat i={4} label="Transaction fees" sol={t.fees.sol} usd={t.fees.usd} />
        <Stat i={5} label="Accounts" sub={`${s.users.toLocaleString()} users · ${s.projects.toLocaleString()} projects`} />
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <ChartCard title="Cumulative revenue vs paid out (SOL)" legend={[{ label: "Revenue", color: "#ff2fa6" }, { label: "Paid to creators", color: "#34d399" }]} range={range}>
          <LineChart data={[series.map((x) => x.cumulative), series.map((x) => x.cumulativePaid)]} keys={[{ label: "Revenue", color: "#ff2fa6" }, { label: "Paid", color: "#34d399" }]} />
        </ChartCard>
        <ChartCard title="Daily fees (SOL)" range={range}><Bars data={series.map((x) => x.revenue)} color="linear-gradient(#ff2fa6,#ff2fa680)" /></ChartCard>
        <ChartCard title="Daily paid to creators (SOL)" range={range}><Bars data={series.map((x) => x.paid)} color="linear-gradient(#34d399,#34d39980)" /></ChartCard>
        <div className="glass rounded-3xl p-4 text-sm text-white/60">
          <h3 className="mb-2 text-sm font-semibold text-white">How this is verified</h3>
          <ul className="list-disc space-y-1 pl-5">
            <li>Entries are written only by Shine&apos;s server after the transaction is confirmed on Solana mainnet.</li>
            <li>Amounts are read from the chain; USD uses the SOL price at the time it was recorded.</li>
            <li>Vault: {s.vault.address ? <a className="font-mono text-pink underline" href={`https://solscan.io/account/${s.vault.address}`} target="_blank" rel="noopener noreferrer">{short(s.vault.address, 6)}</a> : "—"} (balance read live).</li>
            <li>Public API: <a className="text-pink underline" href="/api/public/stats">/api/public/stats</a> · <a className="text-pink underline" href="/api/public/ledger">/api/public/ledger</a></li>
          </ul>
        </div>
      </div>
      <div className="glass overflow-hidden rounded-3xl">
        <div className="flex flex-wrap items-center justify-between gap-2 p-4">
          <h3 className="text-sm font-semibold">Public on-chain ledger <span className="ml-1 text-white/40">· {t.txCount}</span></h3>
          <div className="flex flex-wrap gap-1">{["all", ...Object.keys(TYPE)].map((k) => (
            <button key={k} type="button" onClick={() => setFilter(k)} className={`rounded-full px-2.5 py-1 text-[11px] transition ${filter === k ? "bg-pink text-white" : "bg-white/5 text-white/60 hover:text-white"}`}>{k === "all" ? "All" : TYPE[k][0]}</button>
          ))}</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-white/[.03] text-[11px] uppercase tracking-wider text-white/40"><tr><th className="px-4 py-2.5 font-medium">Date</th><th className="px-4 py-2.5 font-medium">Type</th><th className="px-4 py-2.5 font-medium">Details</th><th className="px-4 py-2.5 text-right font-medium">SOL</th><th className="px-4 py-2.5 text-right font-medium">USD</th><th className="px-4 py-2.5 font-medium">Tx</th></tr></thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.id} className="border-t border-white/5">
                  <td className="whitespace-nowrap px-4 py-3 text-white/55">{new Date(r.at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</td>
                  <td className="px-4 py-3"><span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ${TYPE[r.type]?.[1] || "bg-white/10"}`}>{TYPE[r.type]?.[0] || r.type}</span></td>
                  <td className="max-w-[240px] truncate px-4 py-3 text-white/70">{r.label}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{fmtSol(r.sol, 5)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-white/55">{r.usd != null ? fmtUsd(r.usd) : "—"}</td>
                  <td className="px-4 py-3"><a href={`https://solscan.io/tx/${r.signature}`} target="_blank" rel="noopener noreferrer" className="font-mono text-xs text-pink underline">{short(r.signature, 4)}</a></td>
                </tr>
              ))}
              {rows && !shown.length && <tr><td colSpan={6} className="px-4 py-10 text-center text-white/45">No transactions yet. New fees appear here automatically.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-center text-[11px] text-white/35">Updated {new Date(s.updatedAt).toLocaleTimeString()} · refreshes every minute</p>
    </div>
  );
}
