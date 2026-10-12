"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { Application, Post } from "@/lib/types";
import { Avatar, Button, Sheet, StatusPill } from "./ui";
import { ICON } from "./icons";
import { isPostOpen, timeAgo, toDate } from "@/lib/format";
import { deletePost, updatePost } from "@/lib/db";
import { useToast } from "./toast";
import { friendlyError } from "./status";
import { VerifiedBadge } from "./flags";
import { ActionBtn, LikeButton, ReplyIcon, ShareIcon } from "./actions";
import { MentionText } from "./mention";
import { bumpShare } from "@/lib/engage";
import { ShareSheet } from "./share-sheet";
import { ReplyComposer } from "./reply-composer";
import { SITE_URL } from "@/lib/config";
import { useSession } from "./providers";
import { C } from "@/lib/config";
import { ApplySheet } from "./apply-sheet";

const PeopleIcon = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="8" r="3.5" /><path d="M3 20a6 6 0 0 1 12 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a5.5 5.5 0 0 1 3 5" /></svg>;

export function PostCard({ post, index = 0, myApp, isOwner, detail = false, onReply, autoApply }: { post: Post; index?: number; myApp?: Application; isOwner?: boolean; detail?: boolean; onReply?: () => void; autoApply?: boolean }) {
  const { uid, authenticated, login } = useSession();
  const [shares, setShares] = useState(post.shares || 0);
  const [shareOpen, setShareOpen] = useState(false);
  const [replyOpen, setReplyOpen] = useState(false);
  const [replies, setReplies] = useState(post.replies || 0);
  useEffect(() => setReplies(post.replies || 0), [post.replies]);
  const share = () => setShareOpen(true);
  const onShared = () => { if (uid) { setShares((x) => x + 1); bumpShare(post.id).catch(() => {}); } };
  const reply = () => { if (onReply) return onReply(); if (!authenticated) return login(); setReplyOpen(true); };
  const toast = useToast();
  const open = isPostOpen(post);
  const ends = toDate(post.endsAt ?? null);
  const [menu, setMenu] = useState(false);
  const [applyOpen, setApplyOpen] = useState(false);
  useEffect(() => { if (autoApply && !isOwner && !myApp && isPostOpen(post)) setApplyOpen(true); }, [autoApply]); // eslint-disable-line react-hooks/exhaustive-deps
  const [expanded, setExpanded] = useState(detail);
  const long = (post.text || "").length > 300 || (post.text || "").split("\n").length > 5;
  const [confirmDel, setConfirmDel] = useState(false);
  const [busy, setBusy] = useState(false);
  const toggle = async () => {
    setBusy(true);
    try {
      const reopen = !open;
      await updatePost(post.id, reopen ? { status: "open", ...(ends && ends.getTime() < Date.now() ? { endsAt: null } : {}) } : { status: "closed" });
      toast(reopen ? "Post reopened" : "Post closed", "ok");
    } catch (e) { toast(friendlyError(e), "err"); }
    setBusy(false); setMenu(false);
  };
  const remove = async () => {
    setBusy(true);
    try { await deletePost(post.id); toast("Post deleted", "ok"); } catch (e) { toast(friendlyError(e), "err"); }
    setBusy(false); setConfirmDel(false); setMenu(false);
  };
  return (
    <motion.article initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index, 10) * 0.04 }} className="glass rounded-3xl px-4 pb-2.5 pt-3.5">
      <div className="flex items-center gap-3">
        <Link href={`/u/${post.authorUsername}`} className="shrink-0"><Avatar avatar={post.authorAvatar} size={40} /></Link>
        <Link href={`/u/${post.authorUsername}`} className="min-w-0 flex-1">
          <p className="flex min-w-0 items-center gap-1 font-semibold leading-tight"><span className="min-w-0 truncate">{post.projectName}</span><VerifiedBadge uid={post.authorUid} /></p>
          <p className="truncate text-[13px] text-white/45">@{post.authorUsername} · {timeAgo(post.createdAt)}</p>
        </Link>
        <div className="flex shrink-0 items-center gap-1">
          <StatusPill status={open ? "open" : "closed"} />
          {isOwner && <button onClick={() => setMenu(true)} aria-label="Manage post" className="rounded-full p-1.5 text-white/60 hover:bg-white/10 hover:text-white">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="12" r="1.8" /></svg></button>}
        </div>
      </div>
      <div>
          {post.text && (
            <div className="mt-2.5 text-left">
              {detail
                ? <p className="text-[17px] leading-[1.6] tracking-[-0.003em] text-white/90"><MentionText text={post.text} /></p>
                : <Link href={`/p/${post.id}`} className={`block text-[15.5px] leading-[1.55] tracking-[-0.003em] text-white/90 ${!expanded && long ? "line-clamp-5" : ""}`}><MentionText text={post.text} /></Link>}
              {!detail && long && (
                <button type="button" onClick={() => setExpanded((x) => !x)} className="mt-1 text-[14px] font-semibold text-pink hover:underline">{expanded ? "Show less" : "Show more"}</button>
              )}
            </div>
          )}
          {post.image && (
            <div className="mt-2.5 overflow-hidden rounded-2xl bg-white/[.015]">
              <img src={post.image} alt="" className="block h-auto w-full" style={post.imageRatio ? { aspectRatio: String(post.imageRatio) } : undefined} loading="lazy" />
            </div>
          )}
          <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/50">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-pink/10 px-2.5 py-1 font-semibold text-pink ring-1 ring-pink/25">{PeopleIcon}{(post.applicants || 0).toLocaleString()} applied</span>
            {ends && <span className="inline-flex items-center gap-1">{ICON.clock}{open ? `Closes ${ends.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}` : `Ended ${ends.toLocaleDateString()}`}</span>}
          </div>
          <div className="-ml-2 mt-2 flex items-center justify-between gap-1 border-t border-white/[.06] pt-1.5">
            <div className="flex items-center gap-1 sm:gap-4">
              <ActionBtn label="Reply" icon={ReplyIcon} count={detail ? post.replies || 0 : replies} color="sky" onClick={reply} />
              <LikeButton path={`${C.posts}/${post.id}`} count={post.likes || 0} />
              <ActionBtn label="Share" icon={ShareIcon} count={shares} color="emerald" onClick={share} />
            </div>
            {isOwner ? (
              <Link href={`/register`}><Button size="sm" variant="glass">View applicants</Button></Link>
            ) : myApp ? (
              <Link href="/register"><span className="inline-flex items-center gap-2 text-sm text-white/60">Applied <StatusPill status={myApp.status} /></span></Link>
            ) : open ? (
              <Button size="sm" className="px-6" onClick={() => setApplyOpen(true)}>Apply</Button>
            ) : (
              <Button size="sm" variant="glass" disabled>Closed</Button>
            )}
          </div>
      </div>
      <ApplySheet post={post} open={applyOpen} onClose={() => setApplyOpen(false)} />
      <div onClick={(e) => e.stopPropagation()}>
        <ShareSheet open={shareOpen} onClose={() => setShareOpen(false)} url={`${SITE_URL}/p/${post.id}`} title={`${post.projectName} on Shine`} onShared={onShared} />
        {!detail && <ReplyComposer post={post} open={replyOpen} onClose={() => setReplyOpen(false)} onSent={() => setReplies((x) => x + 1)} />}
      </div>
      <Sheet open={menu} onClose={() => { setMenu(false); setConfirmDel(false); }} title="Manage post">
        {!confirmDel ? (
          <div className="grid gap-2">
            <Link href={`/events/${post.id}/edit`}><Button variant="glass" className="w-full">{ICON.edit} Edit post</Button></Link>
            <Button variant="glass" loading={busy} onClick={toggle}>{open ? "Close applications" : "Reopen applications"}</Button>
            <Button variant="danger" onClick={() => setConfirmDel(true)}>{ICON.trash} Delete post</Button>
          </div>
        ) : (
          <div>
            <p className="text-sm text-white/70">Delete this post permanently? Existing applications remain visible in Review.</p>
            <div className="mt-4 flex gap-2"><Button variant="glass" className="flex-1" onClick={() => setConfirmDel(false)}>Cancel</Button><Button variant="danger" className="flex-1" loading={busy} onClick={remove}>Delete</Button></div>
          </div>
        )}
      </Sheet>
    </motion.article>
  );
}
