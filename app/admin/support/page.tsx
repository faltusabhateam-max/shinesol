"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { collection, getDocs, onSnapshot, orderBy, query } from "firebase/firestore";
import { fb } from "@/lib/firebase";
import { C } from "@/lib/config";
import type { ShineUser, SupportThread } from "@/lib/types";
import { useAdmin } from "@/components/admin";
import { useFlags, VerifiedBadge } from "@/components/flags";
import { Avatar, Segmented, StarLoader } from "@/components/ui";
import { ICON } from "@/components/icons";
import { SupportConversation } from "@/components/support-thread";
import { displayName } from "@/lib/db";
import { timeAgo } from "@/lib/format";

export default function SupportInbox() {
  const { agentUid, action } = useAdmin();
  const { deactivated } = useFlags();
  const [threads, setThreads] = useState<SupportThread[] | null>(null);
  const [users, setUsers] = useState<Record<string, ShineUser>>({});
  const [sel, setSel] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [f, setF] = useState<"all" | "unread" | "reports">("all");
  useEffect(() => {
    const t = new URLSearchParams(location.search).get("t"); if (t) setSel(t);
    getDocs(collection(fb().db, C.users)).then((s) => setUsers(Object.fromEntries(s.docs.map((d) => [d.id, { uid: d.id, ...(d.data() as any) }])))).catch(() => {});
    return onSnapshot(query(collection(fb().db, C.support), orderBy("updatedAt", "desc")), (s) => setThreads(s.docs.map((d) => ({ ...(d.data() as any), uid: d.id }) as SupportThread)), () => setThreads([]));
  }, []);
  const t = q.trim().toLowerCase().replace(/^@/, "");
  const list = useMemo(() => (threads || []).filter((th) => {
    const u = users[th.uid];
    const name = (u ? displayName(u) : th.name || "").toLowerCase();
    return (f === "all" || (f === "unread" && th.unreadForSupport) || (f === "reports" && (th.lastMessage || "").includes("Scam report")))
      && (!t || name.includes(t) || (th.username || u?.username || "").toLowerCase().includes(t));
  }), [threads, users, t, f]);
  const selUser = sel ? users[sel] : null;
  const selThread = threads?.find((x) => x.uid === sel);
  const unread = (threads || []).filter((x) => x.unreadForSupport).length;

  return (
    <div>
      <div className="mb-4 flex items-end justify-between">
        <div><h1 className="font-display text-3xl font-semibold">Support inbox</h1><p className="text-sm text-white/50">{threads ? `${threads.length} conversations · ${unread} awaiting reply` : "Loading…"}</p></div>
        <span className="flex items-center gap-1.5 text-xs text-emerald-300/80"><motion.span className="h-2 w-2 rounded-full bg-emerald-400" animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 1.6 }} />Live</span>
      </div>
      <div className="grid gap-4 md:grid-cols-[340px_1fr]">
        <div className={`${sel ? "hidden md:block" : ""}`}>
          <div className="relative mb-2"><span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/40">{ICON.search}</span>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search conversations" className="input !rounded-2xl !pl-11" /></div>
          <div className="mb-3"><Segmented value={f} onChange={setF} options={[{ value: "all", label: "All" }, { value: "unread", label: `Unread${unread ? ` (${unread})` : ""}` }, { value: "reports", label: "Reports" }]} /></div>
          <div className="no-scrollbar space-y-1.5 md:max-h-[calc(100dvh-17rem)] md:overflow-y-auto">
            {threads === null ? <div className="py-12"><StarLoader /></div> : !list.length ? <p className="py-10 text-center text-sm text-white/45">No conversations.</p> : list.map((th, i) => {
              const u = users[th.uid];
              return (
                <motion.button key={th.uid} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(i, 12) * 0.03 }} onClick={() => setSel(th.uid)}
                  className={`flex w-full items-center gap-3 rounded-2xl border p-2.5 text-left transition ${sel === th.uid ? "border-pink/60 bg-pink/[.08]" : "border-white/10 bg-white/[.03] hover:border-pink/30"}`}>
                  <Avatar avatar={u?.avatar || th.avatar} size={42} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2"><p className="flex items-center gap-1 min-w-0 text-sm font-semibold"><span className="truncate">{u ? displayName(u) : th.name || th.username}</span><VerifiedBadge uid={th.uid} size={13} />{deactivated.has(th.uid) && <span className="text-[9px] uppercase text-red-300">· deactivated</span>}</p><span className="shrink-0 text-[11px] text-white/40">{timeAgo(th.updatedAt)}</span></div>
                    <p className={`truncate text-xs ${th.unreadForSupport ? "font-semibold text-white" : "text-white/50"}`}>{th.lastFrom === "support" ? "You: " : ""}{th.lastMessage}</p>
                  </div>
                  {th.unreadForSupport && <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-pink shadow-[0_0_10px_rgba(255,47,166,.9)]" />}
                </motion.button>
              );
            })}
          </div>
        </div>
        <div className={`${sel ? "" : "hidden md:block"}`}>
          {sel ? (
            <SupportConversation key={sel} threadUid={sel} mode="agent" agentUid={agentUid} adminClear={(uid) => action({ action: "support_clear", uid })} heightClass="h-[calc(100dvh-13rem)] md:h-[calc(100dvh-12rem)]" header={
              <div className="glass mb-3 flex items-center gap-3 rounded-2xl p-2.5">
                <button onClick={() => setSel(null)} className="rounded-full p-2 text-white/70 hover:bg-white/10 md:hidden" aria-label="Back"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg></button>
                <Avatar avatar={selUser?.avatar || selThread?.avatar} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1 min-w-0 font-semibold"><span className="truncate">{selUser ? displayName(selUser) : selThread?.name || "Unknown account"}</span><VerifiedBadge uid={sel} size={14} /></p>
                  <p className="truncate text-xs text-white/45">@{selUser?.username || selThread?.username} · {selUser?.role === "project" ? "Project" : "User"}</p>
                </div>
                <Link href={`/admin/users?u=${sel}`} className="rounded-xl bg-white/[.06] px-3 py-1.5 text-xs font-semibold hover:bg-white/10">View account</Link>
              </div>
            } />
          ) : (
            <div className="glass grid h-[calc(100dvh-14rem)] place-items-center rounded-3xl text-center">
              <div><motion.img src="/brand/star-192.png" alt="" className="mx-auto h-16 w-16 opacity-80" animate={{ rotate: [0, 10, -10, 0] }} transition={{ repeat: Infinity, duration: 5 }} /><p className="mt-3 font-semibold">Select a conversation</p><p className="text-sm text-white/45">Replies are delivered to users in real time.</p></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
