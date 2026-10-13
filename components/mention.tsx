"use client";
import Link from "next/link";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { ShineUser } from "@/lib/types";
import { listUsers, displayName } from "@/lib/db";
import { Avatar } from "./ui";
import { VerifiedBadge } from "./flags";

let usersPromise: Promise<ShineUser[]> | null = null;
export const mentionUsers = () => (usersPromise ??= listUsers().catch(() => { usersPromise = null; return []; }));

/** Renders text with @mentions as pink links to profiles and plain URLs as links. */
export function MentionText({ text, className = "" }: { text: string; className?: string }) {
  const parts: ReactNode[] = [];
  const re = /(@[A-Za-z0-9_]{1,15})|(https?:\/\/[^\s]+)/g;
  let last = 0, m: RegExpExecArray | null, i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[1]) parts.push(<Link key={i++} href={`/u/${m[1].slice(1)}`} onClick={(e) => e.stopPropagation()} className="font-medium text-pink hover:underline">{m[1]}</Link>);
    else parts.push(<a key={i++} href={m[2]} target="_blank" rel="noopener noreferrer nofollow" onClick={(e) => e.stopPropagation()} className="break-all text-pink hover:underline">{m[2]}</a>);
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <span className={`whitespace-pre-wrap break-words ${className}`}>{parts}</span>;
}

export type MentionInputHandle = { focus: () => void; insert: (s: string) => void };
/** Textarea with @mention autocomplete for Shine users. */
export const MentionInput = forwardRef<MentionInputHandle, { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number; maxLength?: number; onSubmit?: () => void; className?: string }>(
  function MentionInput({ value, onChange, placeholder, rows = 2, maxLength = 1000, onSubmit, className = "" }, ref) {
    const ta = useRef<HTMLTextAreaElement>(null);
    const [users, setUsers] = useState<ShineUser[]>([]);
    const [q, setQ] = useState<string | null>(null);
    const [hi, setHi] = useState(0);
    useImperativeHandle(ref, () => ({ focus: () => ta.current?.focus(), insert: (s) => { onChange(s); setTimeout(() => { ta.current?.focus(); ta.current?.setSelectionRange(s.length, s.length); }, 0); } }));
    useEffect(() => { mentionUsers().then(setUsers); }, []);
    const detect = (v: string, caret: number) => {
      const m = /(^|\s)@([A-Za-z0-9_]{0,15})$/.exec(v.slice(0, caret));
      setQ(m ? m[2].toLowerCase() : null); setHi(0);
    };
    const sugg = q === null ? [] : users.filter((u) => u.usernameLower.startsWith(q) || displayName(u).toLowerCase().includes(q)).slice(0, 6);
    const pick = (u: ShineUser) => {
      const el = ta.current!; const caret = el.selectionStart;
      const before = value.slice(0, caret).replace(/@([A-Za-z0-9_]{0,15})$/, `@${u.username} `);
      const next = before + value.slice(caret);
      onChange(next.slice(0, maxLength)); setQ(null);
      setTimeout(() => { el.focus(); el.setSelectionRange(before.length, before.length); }, 0);
    };
    return (
      <div className="relative flex-1">
        <textarea ref={ta} value={value} rows={rows} maxLength={maxLength} placeholder={placeholder}
          onChange={(e) => { onChange(e.target.value); detect(e.target.value, e.target.selectionStart); }}
          onKeyDown={(e) => {
            if (sugg.length) {
              if (e.key === "ArrowDown") { e.preventDefault(); setHi((h) => (h + 1) % sugg.length); return; }
              if (e.key === "ArrowUp") { e.preventDefault(); setHi((h) => (h - 1 + sugg.length) % sugg.length); return; }
              if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); pick(sugg[hi]); return; }
              if (e.key === "Escape") { setQ(null); return; }
            }
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); onSubmit?.(); }
          }}
          onBlur={() => setTimeout(() => setQ(null), 150)}
          className={`w-full resize-none bg-transparent text-[15px] leading-relaxed outline-none placeholder:text-white/35 ${className}`} />
        <AnimatePresence>
          {sugg.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 6 }}
              className="glass-strong absolute bottom-full left-0 z-30 mb-2 w-72 max-w-full overflow-hidden rounded-2xl p-1.5 shadow-[var(--raise-sm)]">
              {sugg.map((u, i) => (
                <button key={u.uid} type="button" onMouseDown={(e) => { e.preventDefault(); pick(u); }} onMouseEnter={() => setHi(i)}
                  className={`flex w-full items-center gap-2.5 rounded-xl p-2 text-left ${i === hi ? "bg-pink/15" : ""}`}>
                  <Avatar avatar={u.avatar} size={30} />
                  <span className="min-w-0"><span className="flex items-center gap-1 min-w-0 text-sm font-semibold"><span className="truncate">{displayName(u)}</span><VerifiedBadge uid={u.uid} size={12} /></span><span className="block text-xs text-white/45">@{u.username}</span></span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  });
