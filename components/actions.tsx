"use client";
import { useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useSession } from "./providers";
import { useToast } from "./toast";
import { friendlyError } from "./status";
import { hasLiked, setLike } from "@/lib/engage";

const fmt = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e4 ? `${Math.round(n / 1e3)}K` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}K` : String(n));

export function ActionBtn({ icon, count, onClick, active, color = "pink", label }: { icon: ReactNode; count?: number; onClick?: () => void; active?: boolean; color?: "pink" | "sky" | "emerald"; label: string }) {
  const tone = { pink: "hover:text-pink group-hover:bg-pink/10", sky: "hover:text-sky-300 group-hover:bg-sky-400/10", emerald: "hover:text-emerald-300 group-hover:bg-emerald-400/10" }[color];
  return (
    <button type="button" aria-label={label} onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClick?.(); }} className={`group flex items-center gap-1 text-[13px] transition ${active ? "text-pink" : "text-white/50"} ${tone.split(" ")[0]}`}>
      <span className={`grid h-8 w-8 place-items-center rounded-full transition ${tone.split(" ")[1]}`}>{icon}</span>
      {count !== undefined && <AnimatePresence mode="popLayout" initial={false}><motion.span key={count} initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -8, opacity: 0 }} className="min-w-[1ch] tabular-nums">{count > 0 ? fmt(count) : ""}</motion.span></AnimatePresence>}
    </button>
  );
}

export const ReplyIcon = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12a8 8 0 0 1 8-8h0a8 8 0 0 1 0 16H7l-3 3v-4.5A8 8 0 0 1 4 12z" /></svg>;
export const ShareIcon = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12M7 8l5-5 5 5" /><path d="M5 13v5a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3v-5" /></svg>;

/** Animated heart like button with optimistic updates. `path` is the Firestore doc path of the liked post/comment. */
export function LikeButton({ path, count = 0, size = 18 }: { path: string; count?: number; size?: number }) {
  const { uid, authenticated, login } = useSession();
  const toast = useToast();
  const [liked, setLiked] = useState(false);
  const [n, setN] = useState(count);
  const [burst, setBurst] = useState(0);
  const [busy, setBusy] = useState(false);
  useEffect(() => { setN(count); }, [count]);
  useEffect(() => { if (uid) hasLiked(path, uid).then(setLiked); else setLiked(false); }, [uid, path]);
  const toggle = async () => {
    if (!authenticated) return login();
    if (!uid || busy) return;
    const next = !liked;
    setLiked(next); setN((x) => Math.max(0, x + (next ? 1 : -1))); if (next) setBurst((b) => b + 1);
    setBusy(true);
    try { await setLike(path, uid, next); } catch (e) { setLiked(!next); setN((x) => Math.max(0, x + (next ? -1 : 1))); toast(friendlyError(e), "err"); }
    setBusy(false);
  };
  return (
    <ActionBtn label={liked ? "Unlike" : "Like"} active={liked} count={n} onClick={toggle} icon={
      <span className="relative">
        <motion.svg key={String(liked)} width={size} height={size} viewBox="0 0 24 24" initial={liked ? { scale: 0.4 } : false} animate={{ scale: [null, 1.25, 1] as any }} transition={{ duration: 0.35 }}
          fill={liked ? "#ff2fa6" : "none"} stroke={liked ? "#ff2fa6" : "currentColor"} strokeWidth="1.9" strokeLinejoin="round">
          <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />
        </motion.svg>
        <AnimatePresence>{burst > 0 && liked && (
          <motion.span key={burst} className="pointer-events-none absolute inset-0" initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ duration: 0.7 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <motion.span key={i} className="absolute left-1/2 top-1/2 h-1 w-1 rounded-full bg-pink" initial={{ x: 0, y: 0 }} animate={{ x: Math.cos((i / 6) * Math.PI * 2) * 14, y: Math.sin((i / 6) * Math.PI * 2) * 14 }} transition={{ duration: 0.5 }} />
            ))}
          </motion.span>
        )}</AnimatePresence>
      </span>
    } />
  );
}
