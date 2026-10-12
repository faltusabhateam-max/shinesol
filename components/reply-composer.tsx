"use client";
import { useEffect, useRef, useState } from "react";
import { BottomSheet } from "./bottom-sheet";
import { Avatar, Button } from "./ui";
import { MentionInput, type MentionInputHandle } from "./mention";
import { useSession } from "./providers";
import { useToast } from "./toast";
import { friendlyError } from "./status";
import { addReply } from "@/lib/engage";
import type { Post } from "@/lib/types";

/** Quick reply composer opened straight from a feed card. */
export function ReplyComposer({ post, open, onClose, onSent }: { post: Post; open: boolean; onClose: () => void; onSent?: () => void }) {
  const { profile } = useSession();
  const toast = useToast();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const ref = useRef<MentionInputHandle>(null);
  useEffect(() => { if (open) setTimeout(() => ref.current?.focus(), 250); }, [open]);
  const send = async () => {
    if (!profile || !text.trim() || busy) return;
    setBusy(true);
    try { await addReply(post.id, profile, text.trim()); setText(""); toast("Reply posted", "ok"); onSent?.(); onClose(); }
    catch (e) { toast(friendlyError(e), "err"); }
    setBusy(false);
  };
  return (
    <BottomSheet open={open} onClose={onClose} title="Reply">
      <div className="mb-3 flex gap-3 border-l-2 border-pink/40 pl-3 text-sm text-white/60">
        <p className="line-clamp-3">Replying to <span className="text-pink">@{post.authorUsername}</span> · {post.text}</p>
      </div>
      {profile ? (
        <div className="flex gap-3">
          <Avatar avatar={profile.avatar} size={38} />
          <div className="min-w-0 flex-1">
            <MentionInput ref={ref} value={text} onChange={setText} rows={4} maxLength={1000} placeholder="Post your reply — type @ to mention" onSubmit={send}
              className="w-full resize-none rounded-2xl bg-white/[.04] p-3 text-[15px] outline-none ring-1 ring-white/10 focus:ring-pink/50" />
            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs text-white/40">{text.length}/1000</span>
              <Button size="sm" loading={busy} disabled={!text.trim()} onClick={send}>Reply</Button>
            </div>
          </div>
        </div>
      ) : <p className="text-sm text-white/60">Set up your Shine profile to reply.</p>}
    </BottomSheet>
  );
}
