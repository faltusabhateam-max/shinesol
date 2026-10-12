"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { collection, limit, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { fb } from "@/lib/firebase";
import { C } from "@/lib/config";
import { listUsers, displayName, socialsOf } from "@/lib/db";
import type { Application, Post, ShineUser } from "@/lib/types";
import { Avatar, Button, Empty, PageTitle, Segmented, StarLoader } from "@/components/ui";
import { ICON } from "@/components/icons";
import { SocialIcons } from "@/components/social";
import { PostCard } from "@/components/post-card";
import { useSession } from "@/components/providers";
import { useFlags, VerifiedBadge } from "@/components/flags";

type Tab = "profile" | "project";

export default function EventsPage() {
  const [tab, setTab] = useState<Tab>("project");
  const [q, setQ] = useState("");
  const [users, setUsers] = useState<ShineUser[] | null>(null);
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [mine, setMine] = useState<Record<string, Application>>({});
  const [err, setErr] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const { profile, uid } = useSession();
  const router = useRouter();
  const { deactivated, isVerified } = useFlags();

  useEffect(() => {
    try { const t = sessionStorage.getItem("shine.eventsTab") as Tab | null; if (t) setTab(t); } catch {}
  }, []);
  const switchTab = (t: Tab) => { setTab(t); try { sessionStorage.setItem("shine.eventsTab", t); } catch {} };

  const loadUsers = async () => {
    setRefreshing(true);
    try { setUsers(await listUsers()); } catch (e: any) { setErr(e?.message || "Could not load profiles."); setUsers([]); }
    setRefreshing(false);
  };
  useEffect(() => { loadUsers(); }, []);
  useEffect(() => {
    const { db } = fb();
    return onSnapshot(query(collection(db, C.posts), orderBy("createdAt", "desc"), limit(150)), (s) => {
      setPosts(s.docs.map((d) => ({ id: d.id, ...(d.data() as any) }) as Post));
    }, (e) => { setErr(e.message); setPosts([]); });
  }, []);
  useEffect(() => {
    if (!uid) { setMine({}); return; }
    const { db } = fb();
    return onSnapshot(query(collection(db, C.applications), where("applicantUid", "==", uid)), (s) => {
      const m: Record<string, Application> = {};
      s.docs.forEach((d) => { const a = { id: d.id, ...(d.data() as any) } as Application; m[a.postId] = a; });
      setMine(m);
    }, () => {});
  }, [uid]);

  const term = q.trim().toLowerCase().replace(/^@/, "");
  const fUsers = useMemo(() => (users || []).filter((u) => !deactivated.has(u.uid)).filter((u) => !term || u.usernameLower.includes(term) || displayName(u).toLowerCase().includes(term) || (u.project?.name || "").toLowerCase().includes(term)).sort((a, b) => Number(isVerified(b.uid)) - Number(isVerified(a.uid))), [users, term, deactivated, isVerified]);
  const fPosts = useMemo(() => (posts || []).filter((p) => !deactivated.has(p.authorUid)).filter((p) => !term || p.projectName.toLowerCase().includes(term) || p.authorUsername.toLowerCase().includes(term) || p.text.toLowerCase().includes(term)), [posts, term, deactivated]);

  return (
    <div>
      <PageTitle sub="Discover Web3 projects, people and opportunities."
        right={profile?.role === "project" && <Link href="/events/new"><Button size="sm">{ICON.plus} New post</Button></Link>}>Events</PageTitle>
      <div className="relative">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/40">{ICON.search}</span>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by project name or username" className="input !rounded-2xl !py-3.5 !pl-11" aria-label="Search" />
      </div>
      <div className="mt-3">
        <Segmented value={tab} onChange={switchTab} options={[{ value: "profile", label: "Profiles" }, { value: "project", label: "Projects" }]} />
      </div>
      {err && <p className="mt-3 text-sm text-red-300">{err}</p>}
      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, x: tab === "profile" ? -20 : 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: tab === "profile" ? 20 : -20 }} transition={{ duration: 0.25 }} className="mt-4">
          {(() => { const shown = fUsers.filter((u) => (tab === "profile" ? u.role !== "project" : u.role === "project")); return (tab === "profile" || true) && (
            users === null ? <div className="py-16"><StarLoader /></div> : (
              <>
                <div className="mb-2 flex justify-end">
                  <button onClick={loadUsers} className="inline-flex items-center gap-1.5 text-xs font-semibold text-white/50 hover:text-white">
                    <motion.span animate={refreshing ? { rotate: 360 } : {}} transition={{ repeat: refreshing ? Infinity : 0, duration: 0.8, ease: "linear" }}>{ICON.refresh}</motion.span> Refresh
                  </button>
                </div>
                {!shown.length ? <Empty title={tab === "profile" ? "No profiles found" : "No projects found"} text={term ? "Try a different search." : "Be the first to create a Shine profile."} /> : (
                  <div className="space-y-2">
                    {shown.map((u, i) => (
                      <motion.div key={u.uid} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 12) * 0.03 }}
                        onClick={() => router.push(`/u/${u.username}`)} role="link" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && router.push(`/u/${u.username}`)}
                        className="glass flex cursor-pointer items-center gap-3 rounded-2xl p-3 transition hover:border-pink/40">
                        <Avatar avatar={u.avatar} size={46} />
                        <div className="min-w-0 flex-1">
                          <p className="flex items-center gap-1.5 min-w-0 font-semibold"><span className="truncate">{displayName(u)}</span><VerifiedBadge uid={u.uid} />{u.role === "project" && <span className="rounded-full bg-pink/15 px-1.5 text-[10px] font-semibold uppercase text-pink">Project</span>}</p>
                          <p className="truncate text-sm text-white/50">@{u.username}</p>
                        </div>
                        <SocialIcons s={socialsOf(u)} />
                      </motion.div>
                    ))}
                  </div>
                )}
              </>
            )
          ); })()}
          {tab === "project" && term && fPosts.length > 0 && (
            <div className="mt-6">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">Matching posts</p>
              <div className="space-y-2.5">{fPosts.slice(0, 20).map((p, i) => <PostCard key={p.id} post={p} index={i} myApp={mine[p.id]} isOwner={p.authorUid === uid} />)}</div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
