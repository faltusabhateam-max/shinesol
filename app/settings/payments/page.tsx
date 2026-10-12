"use client";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useSession } from "@/components/providers";
import { SessionGate } from "@/components/gate";
import { BackLink, Empty, FullLoader, Segmented } from "@/components/ui";
import { EscrowRow, DEMO_PLANS } from "@/components/escrow-list";
import { VaultIcon } from "@/components/escrow";
import { useMyEscrow } from "@/lib/use-escrow-list";
import { currentPeriod, SOL } from "@/lib/escrow";
import { fmtSol, fmtUsd } from "@/lib/format";

const DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === "1";
type Tab = "all" | "paying" | "receiving" | "off";

function Inner() {
  const { uid } = useSession();
  const plans = useMyEscrow(DEMO ? null : uid);
  const list = DEMO ? DEMO_PLANS : plans;
  const me = DEMO ? "me" : uid;
  const [tab, setTab] = useState<Tab>("all");
  useEffect(() => { const t = new URLSearchParams(location.search).get("tab") as Tab | null; if (t) setTab(t); }, []);
  const shown = useMemo(() => (list || []).filter((p) => tab === "all" || (tab === "paying" ? p.projectUid === me : tab === "receiving" ? p.creatorUid === me : p.status === "off" || p.offRequest?.status === "pending")), [list, tab, me]);
  const stats = useMemo(() => {
    const ps = list || [];
    const held = ps.flatMap((p) => p.periods || []).filter((x) => ["funded", "due", "disputed"].includes(x.status)).reduce((s, x) => s + SOL(x.lamports), 0);
    const paid = ps.filter((p) => p.creatorUid === me).flatMap((p) => p.periods || []).filter((x) => x.status === "released").reduce((s, x) => s + x.usd, 0);
    return { active: ps.filter((p) => p.status === "active").length, held, paid };
  }, [list, me]);
  if (list === null) return <FullLoader />;
  return (
    <div className="mx-auto max-w-2xl">
      <BackLink href="/settings" label="Settings" />
      <h1 className="mb-1 font-display text-3xl font-semibold">All auto-payments</h1>
      <p className="mb-4 text-sm text-white/55">Every escrow plan you pay or receive, with live status. Open one to fund, release or request changes.</p>
      <div className="mb-4 grid grid-cols-3 gap-2">
        {[["Active plans", String(stats.active)], ["Held in vault", `${fmtSol(stats.held, 3)} SOL`], ["Received", fmtUsd(stats.paid)]].map(([l, v], i) => (
          <motion.div key={l} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="glass rounded-2xl p-3">
            <p className="font-display text-xl font-semibold">{v}</p><p className="text-[11px] text-white/45">{l}</p>
          </motion.div>
        ))}
      </div>
      <Segmented value={tab} onChange={setTab} options={[{ value: "all", label: "All" }, { value: "paying", label: "Paying" }, { value: "receiving", label: "Receiving" }, { value: "off", label: "Off / requests" }]} />
      <div className="mt-3">
        {!shown.length ? <Empty title="Nothing here" text="Auto-payments appear here once a project sets one up in a chat." /> : (
          <div className="glass divide-y divide-white/[.06] overflow-hidden rounded-3xl">{shown.map((p, i) => <EscrowRow key={p.id} p={p} uid={me} i={i} />)}</div>
        )}
      </div>
      <div className="mt-5 flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[.03] p-4 text-sm text-white/60">
        <span className="text-pink"><VaultIcon /></span>
        <p>Once a project enables auto-payment it can't be switched off by the project. To request it, open the plan and choose <b className="text-white/80">Request to turn auto-payment off</b> — the Shine team reviews it, with your consent to view that chat for 5 minutes.</p>
      </div>
    </div>
  );
}
export default function PaymentsPage() { return <SessionGate text="Sign in to view your auto-payments."><Inner /></SessionGate>; }
