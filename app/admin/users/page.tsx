"use client";
import { useEffect, useMemo, useState } from "react";
import { BottomSheet } from "@/components/bottom-sheet";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { collection, getDoc, doc, getDocs, orderBy, query, where } from "firebase/firestore";
import { fb } from "@/lib/firebase";
import { C } from "@/lib/config";
import type { Application, Post, ShineUser } from "@/lib/types";
import { useAdmin, StatusChip } from "@/components/admin";
import { useFlags, VerifiedBadge } from "@/components/flags";
import { Avatar, Button, Segmented, StarLoader, StatusPill } from "@/components/ui";
import { ICON } from "@/components/icons";
import { SocialRow } from "@/components/social";
import { RichText } from "@/components/bio";
import { AnswerList } from "@/components/answer-list";
import { AdminConfirm } from "@/components/admin-confirm";
import { useToast } from "@/components/toast";
import { displayName, socialsOf } from "@/lib/db";
import { short, timeAgo, toDate } from "@/lib/format";

type F = "all" | "user" | "project" | "verified" | "deactivated";

function AppRow({ a }: { a: Application }) {
  const [open, setOpen] = useState(false);
  const [post, setPost] = useState<Post | null>(null);
  useEffect(() => { if (open && !post) getDoc(doc(fb().db, C.posts, a.postId)).then((s) => s.exists() && setPost({ id: s.id, ...(s.data() as any) })).catch(() => {}); }, [open, post, a.postId]);
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.03]">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center gap-3 p-3 text-left">
        <Avatar avatar={a.applicantAvatar} size={32} />
        <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">@{a.applicantUsername} → {a.projectName}</p><p className="truncate text-xs text-white/45">{a.postExcerpt}</p></div>
        <StatusPill status={a.status} />
        <motion.span animate={{ rotate: open ? 180 : 0 }} className="text-white/40">▾</motion.span>
      </button>
      <AnimatePresence>{open && (
        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
          <div className="space-y-3 border-t border-white/10 p-3">
            <AnswerList app={a} post={post} />
            <p className="text-xs text-white/45">Payout wallet <span className="font-mono text-white/70">{short(a.wallet, 6)}</span> · Applied {toDate(a.createdAt)?.toLocaleString() || "—"}</p>
          </div>
        </motion.div>
      )}</AnimatePresence>
    </div>
  );
}

function Detail({ u, onClose, onDeleted }: { u: ShineUser; onClose: () => void; onDeleted: () => void }) {
  const { action } = useAdmin();
  const { verified, deactivated } = useFlags();
  const toast = useToast();
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [apps, setApps] = useState<Application[] | null>(null);
  const [busy, setBusy] = useState("");
  const [confirm, setConfirm] = useState<null | "deactivate" | "delete">(null);
  const isV = verified.has(u.uid), isD = deactivated.has(u.uid);
  useEffect(() => {
    const { db } = fb();
    getDocs(query(collection(db, C.posts), where("authorUid", "==", u.uid))).then((s) => setPosts(s.docs.map((d) => ({ id: d.id, ...(d.data() as any) })))).catch(() => setPosts([]));
    Promise.all([where("applicantUid", "==", u.uid), where("projectUid", "==", u.uid)].map((w) => getDocs(query(collection(db, C.applications), w))))
      .then((rs) => setApps(rs.flatMap((s) => s.docs.map((d) => ({ id: d.id, ...(d.data() as any) }) as Application)).sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0)))).catch(() => setApps([]));
  }, [u.uid]);
  const run = async (act: string, msg: string, extra: Record<string, any> = {}) => {
    setBusy(act);
    try { await action({ action: act, uid: u.uid, ...extra }); toast(msg, "ok"); setGrant(false); } catch (e: any) { toast(e.message, "err"); }
    setBusy("");
  };
  const { official, paidUntil } = useFlags();
  const [grant, setGrant] = useState(false);
  const [gMode, setGMode] = useState<"permanent" | "timed">("permanent");
  const [months, setMonths] = useState(3);
  const isOfficial = official.has(u.uid);
  const until = paidUntil[u.uid];
  return (
    <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 30 }} className="glass rounded-3xl">
      <div className="relative h-24 overflow-hidden rounded-t-3xl"><img src="/brand/banner.jpg" alt="" className="h-full w-full object-cover" />
        <button onClick={onClose} className="absolute right-3 top-3 rounded-full bg-black/60 p-2 text-white hover:bg-black" aria-label="Close"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg></button>
      </div>
      <div className="px-5 pb-5">
        <div className="-mt-9 flex items-end justify-between"><div className="rounded-full bg-[#050307] p-1"><Avatar avatar={u.avatar} size={72} ring /></div><StatusChip role={u.role} verified={isV} deactivated={isD} /></div>
        <h2 className="mt-2 flex min-w-0 items-center gap-1.5 font-display text-xl font-semibold"><span className="truncate">{displayName(u)}</span><VerifiedBadge uid={u.uid} size={18} /></h2>
        <p className="text-sm text-white/50">@{u.username} · joined {timeAgo(u.createdAt)}</p>
        <div className="mt-3"><SocialRow s={socialsOf(u)} /></div>
        {u.bio?.trim() && <RichText text={u.bio} className="mt-3 text-sm text-white/75" />}
        <div className="mt-3 space-y-1 rounded-2xl bg-white/[.04] p-3 text-xs text-white/55">
          <p>UID <span className="font-mono text-white/75">{u.uid}</span></p>
          {u.wallet && <p>Wallet <a href={`https://solscan.io/account/${u.wallet}`} target="_blank" rel="noopener noreferrer" className="font-mono text-pink hover:underline">{short(u.wallet, 6)}</a></p>}
          {u.project && <p>Project stats: {u.project.xFollowers ?? "—"} X followers · {u.project.telegramMembers ?? "—"} Telegram · {u.project.discordMembers ?? "—"} Discord</p>}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          {isV && <p className="col-span-2 rounded-2xl bg-pink/[.07] px-3 py-2 text-xs text-white/70 ring-1 ring-pink/25"><VerifiedBadge force size={12} className="mr-1 align-middle" />{isOfficial ? "Permanent Shine-team badge (never expires)" : until ? `Timed / paid badge · until ${until.toLocaleDateString(undefined, { dateStyle: "medium" })}` : "Verified"}</p>}
          <Button loading={busy === "verify"} onClick={() => setGrant(true)}><VerifiedBadge force size={15} /> {isV ? "Change badge" : "Grant verified"}</Button>
          {isV && <Button variant="glass" loading={busy === "unverify"} onClick={() => run("unverify", "Verified badge revoked")}>Revoke verified</Button>}
          {isD
            ? <Button variant="glass" loading={busy === "reactivate"} onClick={() => run("reactivate", "Account reactivated")}>Reactivate</Button>
            : <Button variant="danger" onClick={() => setConfirm("deactivate")}>Deactivate</Button>}
          <Link href={`/u/${u.username}`} target="_blank"><Button variant="glass" className="w-full">{ICON.external} Public profile</Button></Link>
          <Link href={`/admin/support?t=${u.uid}`}><Button variant="glass" className="w-full">Message</Button></Link>
          <Button variant="danger" className="col-span-2" onClick={() => setConfirm("delete")}>{ICON.trash} Delete account</Button>
        </div>

        <BottomSheet open={grant} onClose={() => setGrant(false)} title={`Verify @${u.username}`}>
          <div className="space-y-3 pb-4">
            {([["permanent", "Permanent team badge", "Shine logo + verified badge. Never expires — only an admin can revoke it."], ["timed", "Timed badge", "Verified badge with an expiry, like a paid plan. Extends any current expiry."]] as const).map(([m, t, d]) => (
              <button key={m} type="button" onClick={() => setGMode(m)} className={`w-full rounded-2xl p-4 text-left ring-1 transition ${gMode === m ? "bg-pink/10 ring-pink" : "bg-white/[.03] ring-white/10"}`}>
                <p className="flex items-center gap-2 font-semibold">{m === "permanent" ? <img src="/brand/star-64.png" alt="" className="h-4 w-4" /> : <VerifiedBadge force size={15} />}{t}</p>
                <p className="mt-0.5 text-xs text-white/55">{d}</p>
              </button>
            ))}
            {gMode === "timed" && (
              <div className="flex gap-1.5">{[1, 3, 6, 12].map((n) => <button key={n} type="button" onClick={() => setMonths(n)} className={`flex-1 rounded-xl py-2 text-sm font-semibold ring-1 ${months === n ? "bg-pink text-white ring-pink" : "bg-white/5 text-white/60 ring-white/10"}`}>{n === 12 ? "1 year" : `${n} mo`}</button>)}</div>
            )}
            <Button className="w-full" loading={busy === "verify"} onClick={() => run("verify", gMode === "permanent" ? "Permanent team badge granted" : `Verified for ${months === 12 ? "1 year" : `${months} months`}`, { mode: gMode, months })}>Grant badge</Button>
          </div>
        </BottomSheet>

        <h3 className="mt-6 font-display font-semibold">Posts <span className="text-white/40">{posts?.length ?? ""}</span></h3>
        <div className="mt-2 space-y-2">
          {posts === null ? <StarLoader size={28} /> : !posts.length ? <p className="text-sm text-white/40">No posts.</p> : posts.map((p) => (
            <Link key={p.id} href={`/admin/posts?p=${p.id}`} className="block rounded-2xl border border-white/10 bg-white/[.03] p-3 hover:border-pink/40">
              <div className="flex items-center justify-between"><StatusPill status={p.status} /><span className="text-xs text-white/40">{timeAgo(p.createdAt)} · {p.applicants || 0} applied</span></div>
              <p className="mt-1 line-clamp-2 text-sm text-white/75">{p.text}</p>
            </Link>
          ))}
        </div>
        <h3 className="mt-6 font-display font-semibold">Applications <span className="text-white/40">{apps?.length ?? ""}</span></h3>
        <div className="mt-2 space-y-2">
          {apps === null ? <StarLoader size={28} /> : !apps.length ? <p className="text-sm text-white/40">No applications.</p> : apps.map((a) => <AppRow key={a.id} a={a} />)}
        </div>
      </div>
      <AdminConfirm open={confirm === "deactivate"} title={`Deactivate @${u.username}?`} confirmLabel="Deactivate account"
        text="They'll be hidden from Events and blocked from posting, applying and chatting. They can still contact Shine Support. You can reactivate at any time."
        onClose={() => setConfirm(null)} onConfirm={async () => { await run("deactivate", "Account deactivated"); setConfirm(null); }} />
      <AdminConfirm open={confirm === "delete"} title={`Delete @${u.username}?`} confirmLabel="Delete permanently" typeToConfirm={u.username}
        text="This permanently deletes the profile, username, posts, applications, chats and support history. This cannot be undone."
        onClose={() => setConfirm(null)} onConfirm={async () => {
          try { const r = await action({ action: "deleteUser", uid: u.uid }); toast(`Account deleted (${r.deleted?.posts ?? 0} posts, ${r.deleted?.applications ?? 0} applications)`, "ok"); setConfirm(null); onDeleted(); }
          catch (e: any) { toast(e.message, "err"); }
        }} />
    </motion.div>
  );
}

export default function AdminUsers() {
  const { verified, deactivated } = useFlags();
  const [users, setUsers] = useState<ShineUser[] | null>(null);
  const [q, setQ] = useState("");
  const [f, setF] = useState<F>("all");
  const [sel, setSel] = useState<string | null>(null);
  const load = () => getDocs(query(collection(fb().db, C.users), orderBy("createdAt", "desc"))).then((s) => setUsers(s.docs.map((d) => ({ uid: d.id, ...(d.data() as any) }) as ShineUser))).catch(() => setUsers([]));
  useEffect(() => {
    load();
    const sp = new URLSearchParams(location.search);
    if (sp.get("u")) setSel(sp.get("u"));
    const ff = sp.get("f") as F | null; if (ff) setF(ff);
  }, []);
  const t = q.trim().toLowerCase().replace(/^@/, "");
  const list = useMemo(() => (users || []).filter((u) =>
    (f === "all" || (f === "user" && u.role === "user") || (f === "project" && u.role === "project") || (f === "verified" && verified.has(u.uid)) || (f === "deactivated" && deactivated.has(u.uid)))
    && (!t || u.usernameLower?.includes(t) || displayName(u).toLowerCase().includes(t) || u.uid.toLowerCase().includes(t) || (u.wallet || "").toLowerCase().includes(t))), [users, f, t, verified, deactivated]);
  const selected = users?.find((u) => u.uid === sel) || null;
  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="font-display text-3xl font-semibold">Accounts</h1><p className="text-sm text-white/50">{users ? `${users.length} total · ${users.filter((u) => u.role === "project").length} projects` : "Loading…"}</p></div>
      </div>
      <div className="relative mb-3"><span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/40">{ICON.search}</span>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, @username, UID or wallet" className="input !rounded-2xl !py-3.5 !pl-11" /></div>
      <div className="no-scrollbar mb-4 overflow-x-auto"><div className="min-w-[520px]"><Segmented value={f} onChange={setF} options={[{ value: "all", label: "All" }, { value: "user", label: "Users" }, { value: "project", label: "Projects" }, { value: "verified", label: "Verified" }, { value: "deactivated", label: "Deactivated" }]} /></div></div>
      <div className={`grid gap-4 ${selected ? "lg:grid-cols-[1fr_420px]" : ""}`}>
        <div className={`space-y-2 ${selected ? "hidden lg:block" : ""}`}>
          {users === null ? <div className="py-16"><StarLoader /></div> : !list.length ? <p className="py-10 text-center text-sm text-white/45">No accounts match.</p> : list.map((u, i) => (
            <motion.button key={u.uid} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 15) * 0.02 }} onClick={() => setSel(u.uid)}
              className={`glass flex w-full items-center gap-3 rounded-2xl p-3 text-left transition hover:border-pink/40 ${sel === u.uid ? "border-pink/60" : ""} ${deactivated.has(u.uid) ? "opacity-60" : ""}`}>
              <Avatar avatar={u.avatar} size={44} />
              <div className="min-w-0 flex-1"><p className="flex items-center gap-1 min-w-0 font-semibold"><span className="truncate">{displayName(u)}</span><VerifiedBadge uid={u.uid} size={14} /></p><p className="truncate text-sm text-white/45">@{u.username} · {timeAgo(u.createdAt)}</p></div>
              <StatusChip role={u.role} verified={verified.has(u.uid)} deactivated={deactivated.has(u.uid)} />
            </motion.button>
          ))}
        </div>
        <AnimatePresence mode="wait">{selected && <div className="lg:sticky lg:top-20 lg:self-start"><Detail key={selected.uid} u={selected} onClose={() => setSel(null)} onDeleted={() => { setSel(null); load(); }} /></div>}</AnimatePresence>
      </div>
    </div>
  );
}
