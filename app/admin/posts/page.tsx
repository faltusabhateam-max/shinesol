"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { collection, getDocs, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { fb } from "@/lib/firebase";
import { C } from "@/lib/config";
import type { Application, Post } from "@/lib/types";
import { useAdmin } from "@/components/admin";
import { useFlags, VerifiedBadge } from "@/components/flags";
import { Avatar, Button, Segmented, StarLoader, StatusPill } from "@/components/ui";
import { ICON } from "@/components/icons";
import { AnswerList } from "@/components/answer-list";
import { AdminConfirm } from "@/components/admin-confirm";
import { TypeBadge, metaOf } from "@/components/field-types";
import { useToast } from "@/components/toast";
import { isPostOpen, short, timeAgo } from "@/lib/format";

function PostDetail({ p, onClose }: { p: Post; onClose: () => void }) {
  const { action } = useAdmin();
  const toast = useToast();
  const [apps, setApps] = useState<Application[] | null>(null);
  const [del, setDel] = useState(false);
  const [openApp, setOpenApp] = useState<string | null>(null);
  useEffect(() => { getDocs(query(collection(fb().db, C.applications), where("postId", "==", p.id))).then((s) => setApps(s.docs.map((d) => ({ id: d.id, ...(d.data() as any) }) as Application))).catch(() => setApps([])); }, [p.id]);
  return (
    <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 30 }} className="glass rounded-3xl p-5">
      <div className="flex items-start gap-3">
        <Avatar avatar={p.authorAvatar} size={44} />
        <div className="min-w-0 flex-1"><p className="flex items-center gap-1 min-w-0 font-semibold"><span className="truncate">{p.projectName}</span><VerifiedBadge uid={p.authorUid} size={15} /></p><p className="text-sm text-white/45">@{p.authorUsername} · {timeAgo(p.createdAt)}</p></div>
        <button onClick={onClose} className="rounded-full p-2 text-white/60 hover:bg-white/10" aria-label="Close">✕</button>
      </div>
      <p className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed text-white/85">{p.text}</p>
      {p.image && <div className="mt-3 overflow-hidden rounded-2xl bg-white/[.015]"><img src={p.image} alt="" className="block h-auto w-full" /></div>}
      <h3 className="mt-5 font-display font-bold">Form · {p.form.length} steps</h3>
      <div className="mt-2 flex flex-wrap gap-1.5">{p.form.map((f) => <span key={f.id} className="inline-flex items-center gap-1.5 rounded-full bg-white/[.05] py-1 pl-1 pr-2.5 text-xs text-white/70"><TypeBadge type={f.type} size={20} />{f.label}{f.required ? <span className="text-pink">*</span> : null}</span>)}</div>
      <h3 className="mt-5 font-display font-bold">Applications <span className="text-white/40">{apps?.length ?? ""}</span></h3>
      <div className="mt-2 space-y-2">
        {apps === null ? <StarLoader size={28} /> : !apps.length ? <p className="text-sm text-white/40">No applications yet.</p> : apps.map((a) => (
          <div key={a.id} className="rounded-2xl border border-white/10 bg-white/[.03]">
            <button className="flex w-full items-center gap-3 p-3 text-left" onClick={() => setOpenApp(openApp === a.id ? null : a.id)}>
              <Avatar avatar={a.applicantAvatar} size={30} /><p className="flex-1 truncate text-sm font-semibold">@{a.applicantUsername}</p><StatusPill status={a.status} />
            </button>
            <AnimatePresence>{openApp === a.id && <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden"><div className="space-y-2 border-t border-white/10 p-3"><AnswerList app={a} post={p} /><p className="text-xs text-white/45">Wallet <span className="font-mono">{short(a.wallet, 6)}</span></p></div></motion.div>}</AnimatePresence>
          </div>
        ))}
      </div>
      <div className="mt-5 grid grid-cols-2 gap-2">
        <Link href={`/p/${p.id}`} target="_blank"><Button variant="glass" className="w-full">{ICON.external} Open post</Button></Link>
        <Button variant="danger" onClick={() => setDel(true)}>{ICON.trash} Delete post</Button>
      </div>
      <AdminConfirm open={del} title="Delete this post?" confirmLabel="Delete post" text={`The post by ${p.projectName} will be removed from Events permanently. Existing applications remain on record.`}
        onClose={() => setDel(false)} onConfirm={async () => { try { await action({ action: "deletePost", postId: p.id }); toast("Post deleted", "ok"); setDel(false); onClose(); } catch (e: any) { toast(e.message, "err"); } }} />
    </motion.div>
  );
}

export default function AdminPosts() {
  const { deactivated } = useFlags();
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [q, setQ] = useState("");
  const [f, setF] = useState<"all" | "open" | "closed">("all");
  const [sel, setSel] = useState<string | null>(null);
  useEffect(() => {
    const p = new URLSearchParams(location.search).get("p"); if (p) setSel(p);
    return onSnapshot(query(collection(fb().db, C.posts), orderBy("createdAt", "desc")), (s) => setPosts(s.docs.map((d) => ({ id: d.id, ...(d.data() as any) }) as Post)), () => setPosts([]));
  }, []);
  const t = q.trim().toLowerCase();
  const list = useMemo(() => (posts || []).filter((p) => (f === "all" || (f === "open") === isPostOpen(p)) && (!t || p.text.toLowerCase().includes(t) || p.projectName.toLowerCase().includes(t) || p.authorUsername.toLowerCase().includes(t))), [posts, f, t]);
  const selected = posts?.find((p) => p.id === sel) || null;
  return (
    <div>
      <h1 className="font-display text-3xl font-bold">Posts</h1>
      <p className="mb-5 text-sm text-white/50">{posts ? `${posts.length} total · ${posts.filter(isPostOpen).length} open` : "Loading…"}</p>
      <div className="relative mb-3"><span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/40">{ICON.search}</span>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search posts, projects or usernames" className="input !rounded-2xl !py-3.5 !pl-11" /></div>
      <div className="mb-4 max-w-sm"><Segmented value={f} onChange={setF} options={[{ value: "all", label: "All" }, { value: "open", label: "Open" }, { value: "closed", label: "Closed" }]} /></div>
      <div className={`grid gap-4 ${selected ? "lg:grid-cols-[1fr_440px]" : ""}`}>
        <div className={`space-y-2 ${selected ? "hidden lg:block" : ""}`}>
          {posts === null ? <div className="py-16"><StarLoader /></div> : !list.length ? <p className="py-10 text-center text-sm text-white/45">No posts match.</p> : list.map((p, i) => (
            <motion.button key={p.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 15) * 0.02 }} onClick={() => setSel(p.id)}
              className={`glass flex w-full gap-3 rounded-2xl p-3 text-left transition hover:border-pink/40 ${sel === p.id ? "border-pink/60" : ""}`}>
              <Avatar avatar={p.authorAvatar} size={40} />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1 min-w-0 text-sm font-semibold"><span className="truncate">{p.projectName}</span><VerifiedBadge uid={p.authorUid} size={13} />{deactivated.has(p.authorUid) && <span className="ml-1 rounded-full bg-red-500/15 px-1.5 text-[10px] uppercase text-red-300">Hidden</span>}<span className="ml-auto text-xs font-normal text-white/40">{timeAgo(p.createdAt)}</span></p>
                <p className="line-clamp-2 text-sm text-white/60">{p.text}</p>
                <div className="mt-1.5 flex items-center gap-2 text-xs text-white/45"><StatusPill status={isPostOpen(p) ? "open" : "closed"} /> {p.applicants || 0} applied · {p.form.length} steps {p.image && "· 🖼"}</div>
              </div>
            </motion.button>
          ))}
        </div>
        <AnimatePresence mode="wait">{selected && <div className="lg:sticky lg:top-20 lg:self-start"><PostDetail key={selected.id} p={selected} onClose={() => setSel(null)} /></div>}</AnimatePresence>
      </div>
    </div>
  );
}
