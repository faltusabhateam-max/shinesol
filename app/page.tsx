"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { collection, limit, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { fb } from "@/lib/firebase";
import { C, TELEGRAM_GROUP_URL, X_URL } from "@/lib/config";
import type { Application, Post } from "@/lib/types";
import { Button, Empty, StarLoader } from "@/components/ui";
import { ICON, TelegramIcon, XIcon } from "@/components/icons";
import { PostCard } from "@/components/post-card";
import { useSession } from "@/components/providers";
import { useFlags } from "@/components/flags";

type Tab = "foryou" | "latest";
const ms = (t: any) => (t?.toMillis ? t.toMillis() : Date.now());

export default function Home() {
  const { profile, uid } = useSession();
  const { deactivated, isVerified } = useFlags();
  const [tab, setTab] = useState<Tab>("foryou");
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [mine, setMine] = useState<Record<string, Application>>({});
  useEffect(() => onSnapshot(query(collection(fb().db, C.posts), orderBy("createdAt", "desc"), limit(100)),
    (s) => setPosts(s.docs.map((d) => ({ id: d.id, ...(d.data() as any) }) as Post)), () => setPosts([])), []);
  useEffect(() => {
    if (!uid) { setMine({}); return; }
    return onSnapshot(query(collection(fb().db, C.applications), where("applicantUid", "==", uid)), (s) => {
      const m: Record<string, Application> = {}; s.docs.forEach((d) => { const a = { id: d.id, ...(d.data() as any) } as Application; m[a.postId] = a; }); setMine(m);
    }, () => {});
  }, [uid]);
  const list = useMemo(() => {
    const ps = (posts || []).filter((p) => !deactivated.has(p.authorUid));
    if (tab === "latest") return ps;
    // "For you": recency + engagement, with a boost for Shine Verified authors and open opportunities.
    const score = (p: Post) => {
      const ageH = (Date.now() - ms(p.createdAt)) / 3.6e6;
      const eng = Math.log1p((p.likes || 0) + 2 * (p.replies || 0) + 3 * (p.applicants || 0));
      return eng * 2 - ageH / 12 + (isVerified(p.authorUid) ? 4 : 0) + (p.status === "open" ? 1 : 0);
    };
    return [...ps].sort((a, b) => score(b) - score(a));
  }, [posts, tab, deactivated, isVerified]);

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-3 flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold tracking-tight">Home</h1>
        <div className="flex items-center gap-1.5">
          <a href={X_URL} target="_blank" rel="noopener noreferrer" aria-label="Shine on X" className="glass grid h-9 w-9 place-items-center rounded-full hover:border-pink/50"><XIcon size={15} /></a>
          <a href={TELEGRAM_GROUP_URL} target="_blank" rel="noopener noreferrer" aria-label="Shine Community on Telegram" className="glass grid h-9 w-9 place-items-center rounded-full text-[#2aabee] hover:border-pink/50"><TelegramIcon size={16} /></a>
          {profile?.role === "project" && <Link href="/events/new"><Button size="sm">{ICON.plus} Post</Button></Link>}
        </div>
      </div>
      <div className="sticky top-16 z-20 -mx-4 mb-3 border-b border-white/[.06] bg-[#2b2b2e]/80 px-4">
        <div className="flex">
          {([["foryou", "For you"], ["latest", "Latest"]] as const).map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} className={`relative flex-1 py-3 text-[15px] font-semibold transition ${tab === k ? "text-white" : "text-white/45 hover:text-white/70"}`}>
              {l}
              {tab === k && <motion.span layoutId="home-tab" className="absolute bottom-0 left-1/2 h-[3px] w-14 -translate-x-1/2 rounded-full bg-pink shadow-[var(--raise-sm)]" />}
            </button>
          ))}
        </div>
      </div>
      {posts === null ? <div className="py-16"><StarLoader /></div> : !list.length ? (
        <Empty title="Nothing here yet" text="Projects will publish opportunities here. Check back soon." action={profile?.role === "project" ? <Link href="/events/new"><Button>Create the first post</Button></Link> : <Link href="/settings/about"><Button variant="glass">About Shine</Button></Link>} />
      ) : (
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-2.5">
            {list.map((p, i) => <PostCard key={p.id} post={p} index={i} myApp={mine[p.id]} isOwner={p.authorUid === uid} />)}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
