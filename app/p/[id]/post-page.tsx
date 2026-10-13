"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { collection, doc, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { fb } from "@/lib/firebase";
import { C } from "@/lib/config";
import type { Application, Post, ShineUser } from "@/lib/types";
import { useSession } from "@/components/providers";
import { useFlags, VerifiedBadge } from "@/components/flags";
import { PostCard } from "@/components/post-card";
import { Avatar, BackLink, Button, Empty, FullLoader } from "@/components/ui";
import { ActionBtn, LikeButton, ReplyIcon } from "@/components/actions";
import { MentionInput, MentionText, mentionUsers, type MentionInputHandle } from "@/components/mention";
import { useToast } from "@/components/toast";
import { friendlyError } from "@/components/status";
import { ICON } from "@/components/icons";
import { addReply, deleteReply, type Reply } from "@/lib/engage";
import { timeAgo } from "@/lib/format";

function Composer({ post, replyTo, onCancelReply, inputRef }: { post: Post; replyTo: Reply | null; onCancelReply: () => void; inputRef: React.RefObject<MentionInputHandle | null> }) {
  const { profile, authenticated, login, uid } = useSession();
  const { deactivated } = useFlags();
  const toast = useToast();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  if (!authenticated) return (
    <div className="glass flex items-center justify-between gap-3 rounded-3xl p-4"><p className="text-sm text-white/60">Sign in to join the conversation.</p><Button size="sm" onClick={login}>Sign in</Button></div>
  );
  if (!profile) return <div className="glass rounded-3xl p-4 text-sm text-white/60">Complete your <Link href="/profile" className="text-pink underline">profile</Link> to reply.</div>;
  if (uid && deactivated.has(uid)) return <div className="glass rounded-3xl p-4 text-sm text-red-200">Your account is deactivated, so you can't reply.</div>;
  const send = async () => {
    const t = text.trim();
    if (!t || busy) return;
    setBusy(true);
    try { await addReply(post.id, profile, t, replyTo); setText(""); onCancelReply(); toast("Reply posted", "ok"); } catch (e) { toast(friendlyError(e), "err"); }
    setBusy(false);
  };
  return (
    <div className="glass rounded-3xl p-3.5">
      <AnimatePresence>{replyTo && (
        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
          <div className="mb-2 flex items-center justify-between rounded-xl bg-white/[.04] px-3 py-1.5 text-xs text-white/55">
            <span>Replying to <span className="font-semibold text-pink">@{replyTo.username}</span></span>
            <button onClick={onCancelReply} className="text-white/50 hover:text-white" aria-label="Cancel reply">✕</button>
          </div>
        </motion.div>
      )}</AnimatePresence>
      <div className="flex gap-3">
        <Avatar avatar={profile.avatar} size={38} />
        <MentionInput ref={inputRef} value={text} onChange={setText} rows={2} placeholder={replyTo ? `Reply to @${replyTo.username}…` : "Post your reply — type @ to mention someone"} onSubmit={send} className="pt-1.5" />
      </div>
      <div className="mt-2 flex items-center justify-between border-t border-white/[.06] pt-2 pl-[50px]">
        <span className={`text-xs ${text.length > 900 ? "text-amber-200" : "text-white/35"}`}>{text.length}/1000</span>
        <Button size="sm" className="px-5" loading={busy} disabled={!text.trim()} onClick={send}>Reply</Button>
      </div>
    </div>
  );
}

function Comment({ r, kids, all, depth, postId, onReply, avatars, authorUid }: { r: Reply; kids: Reply[]; all: Reply[]; depth: number; postId: string; onReply: (r: Reply) => void; avatars: Record<string, ShineUser>; authorUid: string }) {
  const { uid } = useSession();
  const { deactivated } = useFlags();
  const toast = useToast();
  const [showKids, setShowKids] = useState(depth < 2);
  if (deactivated.has(r.uid)) return null;
  const childrenOf = (id: string) => all.filter((x) => x.parentId === id);
  const avatar = r.avatar === "custom" ? avatars[r.uid]?.avatar : r.avatar;
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="relative">
      <div className="flex gap-3">
        <div className="flex flex-col items-center">
          <Link href={`/u/${r.username}`}><Avatar avatar={avatar} size={depth ? 32 : 40} /></Link>
          {kids.length > 0 && showKids && <div className="mt-1 w-0.5 flex-1 rounded-full bg-gradient-to-b from-white/15 to-transparent" />}
        </div>
        <div className="min-w-0 flex-1 pb-3">
          <p className="flex flex-wrap items-center gap-x-1 text-sm">
            <Link href={`/u/${r.username}`} className="min-w-0 max-w-[65%] truncate font-semibold hover:underline">{r.name}</Link><VerifiedBadge uid={r.uid} size={13} />
            {r.uid === authorUid && <span className="rounded-full bg-pink/15 px-1.5 text-[10px] font-semibold uppercase text-pink">Author</span>}
            <span className="min-w-0 max-w-full truncate text-white/40">@{r.username} · {timeAgo(r.createdAt) || "now"}</span>
          </p>
          {r.replyTo && <p className="text-xs text-white/40">Replying to <Link href={`/u/${r.replyTo}`} className="text-pink hover:underline">@{r.replyTo}</Link></p>}
          <p className="mt-0.5 text-[15px] leading-relaxed text-white/90"><MentionText text={r.text} /></p>
          <div className="-ml-2 mt-0.5 flex items-center gap-4">
            <ActionBtn label="Reply" icon={ReplyIcon} count={kids.length} color="sky" onClick={() => onReply(r)} />
            <LikeButton path={`${C.posts}/${postId}/replies/${r.id}`} count={r.likes || 0} size={16} />
            {r.uid === uid && <button onClick={async () => { try { await deleteReply(postId, r.id); toast("Reply deleted", "ok"); } catch (e) { toast(friendlyError(e), "err"); } }} className="text-white/35 hover:text-red-300" aria-label="Delete reply">{ICON.trash}</button>}
          </div>
          {kids.length > 0 && !showKids && <button onClick={() => setShowKids(true)} className="mt-1 text-xs font-semibold text-pink hover:underline">Show {kids.length} {kids.length === 1 ? "reply" : "replies"}</button>}
        </div>
      </div>
      {kids.length > 0 && showKids && (
        <div className={depth < 3 ? "pl-6 sm:pl-8" : ""}>
          {kids.map((k) => <Comment key={k.id} r={k} kids={childrenOf(k.id)} all={all} depth={depth + 1} postId={postId} onReply={onReply} avatars={avatars} authorUid={authorUid} />)}
        </div>
      )}
    </motion.div>
  );
}

export default function PostPage({ id }: { id: string }) {
  const { uid } = useSession();
  const { deactivated } = useFlags();
  const [post, setPost] = useState<Post | null | undefined>(undefined);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [replyTo, setReplyTo] = useState<Reply | null>(null);
  const [myApp, setMyApp] = useState<Application | undefined>();
  const [avatars, setAvatars] = useState<Record<string, ShineUser>>({});
  const [sort, setSort] = useState<"top" | "new">("top");
  const inputRef = useRef<MentionInputHandle | null>(null);
  const [autoApply, setAutoApply] = useState(false);
  useEffect(() => { setAutoApply(new URLSearchParams(location.search).get("apply") === "1"); }, []);
  const composerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const { db } = fb();
    const u1 = onSnapshot(doc(db, C.posts, id), (s) => setPost(s.exists() ? ({ id: s.id, ...(s.data() as any) } as Post) : null), () => setPost(null));
    const u2 = onSnapshot(query(collection(db, C.posts, id, "replies"), orderBy("createdAt", "asc")), (s) => setReplies(s.docs.map((d) => ({ id: d.id, ...(d.data() as any) }) as Reply)), () => {});
    mentionUsers().then((us) => setAvatars(Object.fromEntries(us.map((u) => [u.uid, u]))));
    return () => { u1(); u2(); };
  }, [id]);
  useEffect(() => {
    if (!uid) return;
    return onSnapshot(query(collection(fb().db, C.applications), where("applicantUid", "==", uid), where("postId", "==", id)), (s) => setMyApp(s.docs[0] ? ({ id: s.docs[0].id, ...(s.docs[0].data() as any) } as Application) : undefined), () => {});
  }, [uid, id]);
  useEffect(() => { if (post && location.hash === "#replies") setTimeout(() => composerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 300); }, [post]);

  const top = useMemo(() => {
    const t = replies.filter((r) => !r.parentId || !replies.some((x) => x.id === r.parentId));
    return sort === "top" ? [...t].sort((a, b) => (b.likes || 0) - (a.likes || 0) || (a.createdAt?.toMillis?.() || 0) - (b.createdAt?.toMillis?.() || 0)) : [...t].reverse();
  }, [replies, sort]);
  const focusReply = (r: Reply | null) => { setReplyTo(r); composerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }); setTimeout(() => inputRef.current?.focus(), 350); };

  if (post === undefined) return <FullLoader />;
  if (!post || deactivated.has(post.authorUid)) return <><BackLink href="/events" label="Events" /><Empty title="Post not found" text="This opportunity may have been removed." /></>;

  return (
    <div className="mx-auto max-w-2xl">
      <BackLink href="/events" label="Events" />
      <PostCard post={post} myApp={myApp} isOwner={post.authorUid === uid} detail onReply={() => focusReply(null)} autoApply={autoApply} />
      <div id="replies" ref={composerRef} className="mt-4 scroll-mt-24"><Composer post={post} replyTo={replyTo} onCancelReply={() => setReplyTo(null)} inputRef={inputRef} /></div>
      <div className="mt-5 flex items-center justify-between">
        <h2 className="font-display text-lg font-bold">Replies <span className="text-white/40">{post.replies || 0}</span></h2>
        <div className="flex rounded-full bg-white/[.05] p-0.5 text-xs font-semibold">
          {(["top", "new"] as const).map((s) => (
            <button key={s} onClick={() => setSort(s)} className={`relative rounded-full px-3 py-1 ${sort === s ? "text-white" : "text-white/45"}`}>
              {sort === s && <motion.span layoutId="reply-sort" className="absolute inset-0 rounded-full neu-inset" />}<span className="relative">{s === "top" ? "Top" : "Latest"}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="mt-3 space-y-1">
        {!top.length ? <p className="py-10 text-center text-sm text-white/40">No replies yet. Start the conversation.</p>
          : top.map((r) => <div key={r.id} className="glass rounded-3xl p-4 pb-1"><Comment r={r} kids={replies.filter((x) => x.parentId === r.id)} all={replies} depth={0} postId={post.id} onReply={focusReply} avatars={avatars} authorUid={post.authorUid} /></div>)}
      </div>
    </div>
  );
}
