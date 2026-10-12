"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { collection, doc, onSnapshot, query, where } from "firebase/firestore";
import { fb } from "@/lib/firebase";
import { C } from "@/lib/config";
import type { Chat, SupportThread } from "@/lib/types";
import { SupportAvatar } from "@/components/support-thread";
import { VerifiedBadge } from "@/components/flags";
import { SessionGate } from "@/components/gate";
import { useSession } from "@/components/providers";
import { Avatar, Button, Empty, FullLoader, PageTitle } from "@/components/ui";
import { timeAgo } from "@/lib/format";

function Inner() {
  const { uid, profile } = useSession();
  const [chats, setChats] = useState<Chat[] | null>(null);
  const [support, setSupport] = useState<SupportThread | null>(null);
  useEffect(() => {
    if (!uid) return;
    return onSnapshot(doc(fb().db, C.support, uid), (s) => setSupport(s.exists() ? (s.data() as SupportThread) : null), () => {});
  }, [uid]);
  useEffect(() => {
    const { db } = fb();
    return onSnapshot(query(collection(db, C.chats), where("members", "array-contains", uid)), (s) =>
      setChats(s.docs.map((d) => ({ id: d.id, ...(d.data() as any) }) as Chat).sort((a, b) => (b.updatedAt?.toMillis?.() || 0) - (a.updatedAt?.toMillis?.() || 0))),
      () => setChats([]));
  }, [uid]);
  if (!chats) return <FullLoader />;
  const unread = !!support?.unreadForUser;
  return (
    <>
      <PageTitle sub="Private conversations unlock when an application is approved.">Chat</PageTitle>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-4">
        <Link href="/chat/support" className="glass neon relative flex items-center gap-3 overflow-hidden rounded-2xl border-pink/30 p-3 hover:border-pink/60">
          <motion.div className="pointer-events-none absolute -left-10 top-0 h-full w-24 bg-gradient-to-r from-transparent via-pink/15 to-transparent" animate={{ x: ["0%", "600%"] }} transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut", repeatDelay: 2 }} />
          <SupportAvatar size={48} />
          <div className="relative min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <p className="flex items-center gap-1 min-w-0 font-semibold"><span className="truncate">Shine Support </span><VerifiedBadge force size={15} /></p>
              <span className="flex shrink-0 items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-pink"><svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M15 3 9 9H5l4 4-5 8 8-5 4 4V11l6-6z" /></svg>Pinned</span>
            </div>
            <p className={`truncate text-sm ${unread ? "font-semibold text-white" : "text-white/55"}`}>{support?.lastMessage ? `${support.lastFrom === "support" ? "Support: " : "You: "}${support.lastMessage}` : "Get help or report a scam — we're here for you."}</p>
          </div>
          {unread && <motion.span className="relative h-2.5 w-2.5 rounded-full bg-pink shadow-[0_0_10px_rgba(255,47,166,.9)]" animate={{ scale: [1, 1.3, 1] }} transition={{ repeat: Infinity, duration: 1.4 }} />}
        </Link>
      </motion.div>
      {!chats.length ? (
        <Empty title="No conversations yet" text={profile?.role === "project" ? "Approve an applicant in Review to start a chat." : "Once a project approves your application, your chat appears here."}
          action={<Link href={profile?.role === "project" ? "/register" : "/events"}><Button>{profile?.role === "project" ? "Open Review" : "Browse Events"}</Button></Link>} />
      ) : (
        <div className="space-y-2">
          {chats.map((c, i) => {
            const amProject = c.projectUid === uid;
            return (
              <motion.div key={c.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 10) * 0.03 }}>
                <Link href={`/chat/${c.id}`} className="glass flex items-center gap-3 rounded-2xl p-3 hover:border-pink/40">
                  <Avatar avatar={amProject ? c.applicantAvatar : c.projectAvatar} size={48} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="flex items-center gap-1 min-w-0 font-semibold"><span className="truncate">{amProject ? `@${c.applicantUsername}` : c.projectName}</span>{!amProject && <VerifiedBadge uid={c.projectUid} size={14} />}</p>
                      <span className="shrink-0 text-xs text-white/40">{timeAgo(c.updatedAt)}</span>
                    </div>
                    <p className="truncate text-sm text-white/55">{c.lastMessage || c.postExcerpt}</p>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}
    </>
  );
}
export default function ChatList() {
  return <SessionGate text="Sign in to view your conversations."><Inner /></SessionGate>;
}
