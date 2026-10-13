"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { collection, onSnapshot } from "firebase/firestore";
import { fb } from "@/lib/firebase";
import { useAdmin } from "@/components/admin";
import { useFlags, VerifiedBadge } from "@/components/flags";
import { Button } from "@/components/ui";
import { useToast } from "@/components/toast";
import { short } from "@/lib/format";

type Aff = { id: string; projectUid: string; projectUsername: string; projectName: string; enabled: boolean; paidTx?: string; members: { uid: string; username: string }[] };

export default function AdminAffiliates() {
  const { action } = useAdmin();
  const { isVerified } = useFlags();
  const toast = useToast();
  const [rows, setRows] = useState<Aff[] | null>(null);
  useEffect(() => onSnapshot(collection(fb().db, "shine_affiliates"), (s) => setRows(s.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))), () => setRows([])), []);
  const run = async (body: Record<string, any>, ok: string) => { try { await action(body); toast(ok, "ok"); } catch (e: any) { toast(e.message, "err"); } };
  return (
    <div>
      <h1 className="mb-1 font-display text-2xl font-bold">Affiliates</h1>
      <p className="mb-5 text-sm text-white/50">Projects that unlocked affiliate distribution. Badges show only while the project&apos;s Verified plan is active.</p>
      {!rows ? <p className="text-white/50">Loading…</p> : !rows.length ? <p className="glass rounded-2xl p-6 text-center text-white/50">No affiliate programs yet.</p> : (
        <div className="grid gap-3">{rows.map((a, i) => (
          <motion.div key={a.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="glass rounded-2xl p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <Link href={`/u/${a.projectUsername}`} className="flex items-center gap-1.5 min-w-0 font-semibold hover:text-pink"><span className="truncate">{a.projectName}</span><VerifiedBadge uid={a.projectUid} size={14} /></Link>
                <p className="text-xs text-white/45">@{a.projectUsername} · {a.enabled ? "Enabled" : "Disabled"} · {isVerified(a.projectUid) ? "plan active" : "plan expired"}{a.paidTx && <> · <a className="text-pink underline" href={`https://solscan.io/tx/${a.paidTx}`} target="_blank" rel="noopener noreferrer">{short(a.paidTx, 4)}</a></>} · {a.members?.length || 0}/20</p>
              </div>
              {a.enabled && <Button size="sm" variant="danger" onClick={() => run({ action: "affiliate_disable", projectUid: a.projectUid }, "Affiliate program disabled")}>Disable & revoke all</Button>}
            </div>
            {!!a.members?.length && <ul className="mt-3 flex flex-wrap gap-2">{a.members.map((m) => (
              <li key={m.uid} className="flex items-center gap-2 rounded-full bg-white/5 py-1 pl-3 pr-1 text-sm">@{m.username}
                <button type="button" onClick={() => run({ action: "affiliate_revoke", projectUid: a.projectUid, uid: m.uid }, `Revoked @${m.username}`)} className="rounded-full bg-red-500/15 px-2 py-0.5 text-xs text-red-300 hover:bg-red-500/25">Revoke</button></li>
            ))}</ul>}
          </motion.div>
        ))}</div>
      )}
    </div>
  );
}
