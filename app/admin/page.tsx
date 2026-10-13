"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { animate, motion, useMotionValue, useTransform } from "framer-motion";
import { collection, getCountFromServer, getDocs, limit, orderBy, query, where, type Query } from "firebase/firestore";
import { fb } from "@/lib/firebase";
import { C } from "@/lib/config";
import type { Post, ShineUser } from "@/lib/types";
import { useFlags, VerifiedBadge } from "@/components/flags";
import { Avatar } from "@/components/ui";
import { displayName } from "@/lib/db";
import { timeAgo } from "@/lib/format";

function CountUp({ to }: { to: number | null }) {
  const mv = useMotionValue(0);
  const txt = useTransform(mv, (v) => Math.round(v).toLocaleString());
  useEffect(() => { if (to != null) { const c = animate(mv, to, { duration: 1.1, ease: [0.22, 1, 0.36, 1] }); return c.stop; } }, [to, mv]);
  return to == null ? <span className="skeleton inline-block h-8 w-14 rounded-lg" /> : <motion.span>{txt}</motion.span>;
}

const IC = (d: React.ReactNode) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{d}</svg>;

export default function AdminDashboard() {
  const { verified, deactivated } = useFlags();
  const [c, setC] = useState<Record<string, number | null>>({});
  const [recentUsers, setRecentUsers] = useState<ShineUser[]>([]);
  const [recentPosts, setRecentPosts] = useState<Post[]>([]);
  useEffect(() => {
    const { db } = fb();
    const q: Record<string, Query> = {
      users: collection(db, C.users),
      projects: query(collection(db, C.users), where("role", "==", "project")),
      posts: collection(db, C.posts),
      open: query(collection(db, C.posts), where("status", "==", "open")),
      apps: collection(db, C.applications),
      pending: query(collection(db, C.applications), where("status", "==", "pending")),
      approved: query(collection(db, C.applications), where("status", "==", "approved")),
      rejected: query(collection(db, C.applications), where("status", "==", "rejected")),
      chats: query(collection(db, C.escrow), where("status", "==", "active")),
      disputes: collection(db, C.escrow),
      support: collection(db, C.support),
      unread: query(collection(db, C.support), where("unreadForSupport", "==", true)),
    };
    Object.entries(q).forEach(([k, qq]) => getCountFromServer(qq).then((r) => setC((x) => ({ ...x, [k]: r.data().count }))).catch(() => setC((x) => ({ ...x, [k]: 0 }))));
    getDocs(query(collection(db, C.users), orderBy("createdAt", "desc"), limit(6))).then((s) => setRecentUsers(s.docs.map((d) => ({ uid: d.id, ...(d.data() as any) })))).catch(() => {});
    getDocs(query(collection(db, C.posts), orderBy("createdAt", "desc"), limit(5))).then((s) => setRecentPosts(s.docs.map((d) => ({ id: d.id, ...(d.data() as any) })))).catch(() => {});
  }, []);
  const g = (k: string) => (k in c ? c[k]! : null);
  const stats = [
    { k: "users", label: "Accounts", sub: `${g("projects") ?? "…"} projects`, icon: IC(<><circle cx="9" cy="8" r="3.5" /><path d="M3 20a6 6 0 0 1 12 0M16 4.5a3.5 3.5 0 0 1 0 7" /></>), href: "/admin/users" },
    { k: "posts", label: "Posts", sub: `${g("open") ?? "…"} open`, icon: IC(<><rect x="4" y="4" width="16" height="16" rx="3" /><path d="M8 9h8M8 13h8" /></>), href: "/admin/posts" },
    { k: "apps", label: "Applications", sub: `${g("pending") ?? "…"} pending review`, icon: IC(<><path d="M9 4h6v3H9z" /><rect x="5" y="5" width="14" height="16" rx="2.5" /><path d="m9 14 2 2 4-4" /></>), href: "/admin/users" },
    { k: "chats", label: "Active auto-payments", sub: `${g("disputes") ?? "…"} escrow plans total`, icon: IC(<path d="M4 12a8 8 0 1 1 3.3 6.5L4 20l1-3.6A8 8 0 0 1 4 12z" />), href: "/admin/escrow" },
    { k: "support", label: "Support threads", sub: `${g("unread") ?? "…"} awaiting reply`, icon: IC(<><path d="M4 12a8 8 0 0 1 16 0v4a2 2 0 0 1-2 2h-2v-6h4M4 12v4a2 2 0 0 0 2 2h2v-6H4" /></>), href: "/admin/support", hot: (g("unread") || 0) > 0 },
    { k: "_v", label: "Verified projects", value: verified.size, sub: "Blue-chip trust", icon: IC(<path d="M12 3l2.5 2 3.2-.3.9 3.1 2.6 1.9-1.1 3 1.1 3.1-2.6 1.9-.9 3.1-3.2-.3L12 23" />), href: "/admin/users?f=verified" },
    { k: "_d", label: "Deactivated", value: deactivated.size, sub: "Hidden from Events", icon: IC(<><circle cx="12" cy="12" r="9" /><path d="M5.6 5.6l12.8 12.8" /></>), href: "/admin/users?f=deactivated" },
    { k: "rejected", label: "Rejected apps", sub: "All time", icon: IC(<path d="M6 6l12 12M18 6 6 18" />), href: "/admin/users" },
  ];
  const total = (g("approved") || 0) + (g("pending") || 0) + (g("rejected") || 0);
  const pct = (n: number | null) => (total ? Math.round(((n || 0) / total) * 100) : 0);
  return (
    <div>
      <div className="mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-pink">Control center</p>
        <h1 className="font-display text-3xl font-bold">Dashboard</h1>
        <p className="text-sm text-white/50">Live overview of the Shine platform.</p>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s, i) => (
          <motion.div key={s.k} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Link href={s.href} className={`glass group relative block overflow-hidden rounded-3xl p-4 transition hover:border-pink/40 ${s.hot ? "neon" : ""}`}>
              <motion.span whileHover={{ rotate: -8, scale: 1.1 }} className="relative grid h-10 w-10 place-items-center rounded-2xl icon-grad neu-sm text-pink">{s.icon}</motion.span>
              <p className="relative mt-3 font-display text-3xl font-bold"><CountUp to={"value" in s ? (s.value as number) : g(s.k)} /></p>
              <p className="relative text-sm font-semibold text-white/80">{s.label}</p>
              <p className="relative text-xs text-white/45">{s.sub}</p>
            </Link>
          </motion.div>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="glass rounded-3xl p-5">
          <h3 className="font-display font-bold">Application funnel</h3>
          <div className="mt-4 space-y-3">
            {[["Approved", g("approved"), "from-emerald-400 to-emerald-300"], ["Pending", g("pending"), "from-amber-300 to-amber-200"], ["Rejected", g("rejected"), "from-red-400 to-red-300"]].map(([l, n, col]) => (
              <div key={l as string}>
                <div className="mb-1 flex justify-between text-sm"><span className="text-white/70">{l as string}</span><span className="font-semibold">{(n as number) ?? "…"} <span className="text-white/40">· {pct(n as number)}%</span></span></div>
                <div className="h-2 overflow-hidden rounded-full neu-inset"><motion.div className={`h-full rounded-full bg-gradient-to-r ${col}`} initial={{ width: 0 }} animate={{ width: `${pct(n as number)}%` }} transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }} /></div>
              </div>
            ))}
          </div>
        </div>
        <div className="glass rounded-3xl p-5">
          <div className="flex items-center justify-between"><h3 className="font-display font-bold">Newest accounts</h3><Link href="/admin/users" className="text-xs font-semibold text-pink">View all</Link></div>
          <div className="mt-3 space-y-2">
            {recentUsers.map((u) => (
              <Link key={u.uid} href={`/admin/users?u=${u.uid}`} className="flex items-center gap-3 rounded-2xl p-1.5 hover:bg-white/[.04]">
                <Avatar avatar={u.avatar} size={34} />
                <div className="min-w-0 flex-1"><p className="flex items-center gap-1 min-w-0 text-sm font-semibold"><span className="truncate">{displayName(u)}</span><VerifiedBadge uid={u.uid} size={13} /></p><p className="text-xs text-white/45">@{u.username}</p></div>
                <span className="text-xs text-white/40">{timeAgo(u.createdAt)}</span>
              </Link>
            ))}
            {!recentUsers.length && <p className="text-sm text-white/40">No accounts yet.</p>}
          </div>
        </div>
        <div className="glass rounded-3xl p-5">
          <div className="flex items-center justify-between"><h3 className="font-display font-bold">Latest posts</h3><Link href="/admin/posts" className="text-xs font-semibold text-pink">View all</Link></div>
          <div className="mt-3 space-y-2">
            {recentPosts.map((p) => (
              <Link key={p.id} href={`/admin/posts?p=${p.id}`} className="block rounded-2xl p-2 hover:bg-white/[.04]">
                <p className="flex items-center gap-1 min-w-0 text-sm font-semibold"><span className="truncate">{p.projectName}</span><VerifiedBadge uid={p.authorUid} size={13} /><span className="ml-auto text-xs font-normal text-white/40">{timeAgo(p.createdAt)}</span></p>
                <p className="line-clamp-2 text-xs text-white/55">{p.text}</p>
              </Link>
            ))}
            {!recentPosts.length && <p className="text-sm text-white/40">No posts yet.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
