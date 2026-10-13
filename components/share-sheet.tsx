"use client";
import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { BottomSheet } from "./bottom-sheet";
import { useToast } from "./toast";

type Target = { id: string; label: string; bg: string; icon: ReactNode; href?: (u: string, t: string) => string; copyThen?: string };
const I = (d: string, fill = true) => <svg width="24" height="24" viewBox="0 0 24 24" fill={fill ? "currentColor" : "none"} stroke={fill ? "none" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>;
const e = encodeURIComponent;
const TARGETS: Target[] = [
  { id: "wa", label: "WhatsApp", bg: "#25D366", icon: I("M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.4-.7a11.6 11.6 0 0 1-4.5-4c-.6-.8-1-1.8-1-2.8 0-1.3.7-2 1-2.3.3-.3.6-.3.8-.3h.6c.2 0 .4 0 .6.5l.9 2.1c.1.2.1.4 0 .6l-.4.6-.4.4c-.1.2-.3.3-.1.6.6 1 1.3 1.8 2.2 2.4.6.4 1.1.6 1.4.7.2.1.4.1.5-.1l.8-.9c.2-.3.4-.2.6-.1l2 .9c.3.2.5.2.5.4.1.1.1.6-.1 1.1z"), href: (u, t) => `https://wa.me/?text=${e(`${t} ${u}`)}` },
  { id: "tg", label: "Telegram", bg: "#229ED9", icon: I("M21.9 4.3l-3.2 15.1c-.2 1-.9 1.3-1.8.8l-4.9-3.6-2.4 2.3c-.3.3-.5.5-1 .5l.3-5 9.1-8.2c.4-.4-.1-.6-.6-.2L6.2 13 1.4 11.5c-1-.3-1-1 .2-1.5L20.6 2.8c.9-.3 1.6.2 1.3 1.5z"), href: (u, t) => `https://t.me/share/url?url=${e(u)}&text=${e(t)}` },
  { id: "x", label: "X", bg: "#000", icon: I("M17.8 3h3.1l-6.8 7.7L22 21h-6.2l-4.9-6.4L5.3 21H2.2l7.2-8.3L1.9 3h6.4l4.4 5.8L17.8 3zm-1.1 16.2h1.7L7.4 4.7H5.5l11.2 14.5z"), href: (u, t) => `https://x.com/intent/post?text=${e(t)}&url=${e(u)}` },
  { id: "ig", label: "Instagram", bg: "linear-gradient(45deg,#f9ce34,#ee2a7b,#6228d7)", icon: I("M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm5 5a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0 2a3 3 0 1 1 0 6 3 3 0 0 1 0-6zm5.5-3.2a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4z"), copyThen: "https://www.instagram.com/" },
  { id: "fb", label: "Facebook", bg: "#1877F2", icon: I("M14 8V6.3c0-.8.2-1.3 1.4-1.3H17V2h-2.6C11.2 2 10 3.7 10 6.4V8H8v3h2v11h4V11h2.7l.4-3H14z"), href: (u) => `https://www.facebook.com/sharer/sharer.php?u=${e(u)}` },
  { id: "li", label: "LinkedIn", bg: "#0A66C2", icon: I("M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9.5h4V21H3V9.5zm6.5 0h3.8v1.6h.1c.5-1 1.8-2 3.8-2 4 0 4.8 2.6 4.8 6V21h-4v-5.2c0-1.3 0-2.9-1.8-2.9s-2 1.4-2 2.8V21h-4V9.5z"), href: (u) => `https://www.linkedin.com/sharing/share-offsite/?url=${e(u)}` },
  { id: "dc", label: "Discord", bg: "#5865F2", icon: I("M20.3 4.4A19.6 19.6 0 0 0 15.4 3l-.6 1.3a18 18 0 0 0-5.6 0L8.6 3a19.5 19.5 0 0 0-4.9 1.5C.6 9.1-.3 13.7.2 18.2A19.7 19.7 0 0 0 6.2 21l1.3-2.1-2-1 .5-.4a14 14 0 0 0 12 0l.5.4-2 1 1.3 2.1a19.6 19.6 0 0 0 6-3c.5-5.2-.9-9.8-3.5-13.6zM8.5 15.4c-1.2 0-2.2-1.1-2.2-2.4s1-2.4 2.2-2.4 2.2 1.1 2.2 2.4-1 2.4-2.2 2.4zm7 0c-1.2 0-2.2-1.1-2.2-2.4s1-2.4 2.2-2.4 2.2 1.1 2.2 2.4-1 2.4-2.2 2.4z"), copyThen: "" },
  { id: "em", label: "Email", bg: "#3a3a44", icon: I("M3 6h18v12H3zM3 6l9 7 9-7", false), href: (u, t) => `mailto:?subject=${e(t)}&body=${e(`${t}\n\n${u}`)}` },
];

/** Shine-themed share sheet: social apps, copy link and the device's native share. Returns via onShared when the user picks a target. */
export function ShareSheet({ open, onClose, url, title, onShared }: { open: boolean; onClose: () => void; url: string; title: string; onShared?: () => void }) {
  const toast = useToast();
  const copy = async () => { try { await navigator.clipboard.writeText(url); return true; } catch { return false; } };
  const pick = async (t: Target) => {
    if (t.href) window.open(t.href(url, title), t.id === "em" ? "_self" : "_blank", "noopener,noreferrer");
    else if (t.copyThen !== undefined) {
      const ok = await copy();
      toast(ok ? (t.id === "ig" ? "Link copied — paste it in your Instagram story or DM" : `Link copied — paste it in ${t.label}`) : "Couldn't copy the link", ok ? "ok" : "err");
      if (t.copyThen) window.open(t.copyThen, "_blank", "noopener,noreferrer");
    }
    onShared?.(); onClose();
  };
  const canNative = typeof navigator !== "undefined" && !!navigator.share;
  return (
    <BottomSheet open={open} onClose={onClose} title="Share">
      <div className="mb-4 flex items-center gap-2 rounded-2xl bg-white/[.04] p-2 ring-1 ring-white/10">
        <span className="min-w-0 flex-1 truncate px-2 font-mono text-xs text-white/60">{url}</span>
        <motion.button type="button" whileTap={{ scale: 0.94 }} onClick={async () => { const ok = await copy(); toast(ok ? "Link copied" : "Couldn't copy the link", ok ? "ok" : "err"); if (ok) { onShared?.(); onClose(); } }}
          className="rounded-xl bg-pink px-3 py-2 text-xs font-semibold text-white shadow-[var(--raise-sm)]">Copy link</motion.button>
      </div>
      <div className="grid grid-cols-4 gap-x-2 gap-y-4 sm:grid-cols-5">
        {TARGETS.map((t, i) => (
          <motion.button key={t.id} type="button" onClick={() => pick(t)} initial={{ opacity: 0, y: 14, scale: 0.8 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: 0.03 * i, type: "spring", stiffness: 380, damping: 22 }}
            whileHover={{ y: -3 }} whileTap={{ scale: 0.9 }} className="flex flex-col items-center gap-1.5 text-[11px] text-white/75">
            <span className="grid h-14 w-14 place-items-center rounded-2xl text-white ring-1 ring-white/15 shadow-lg" style={{ background: t.bg }}>{t.icon}</span>{t.label}
          </motion.button>
        ))}
        {canNative && (
          <motion.button type="button" initial={{ opacity: 0, y: 14, scale: 0.8 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: 0.27 }} whileHover={{ y: -3 }} whileTap={{ scale: 0.9 }}
            onClick={async () => { try { await navigator.share({ title, url }); onShared?.(); onClose(); } catch {} }} className="flex flex-col items-center gap-1.5 text-[11px] text-white/75">
            <span className="glass grid h-14 w-14 place-items-center rounded-2xl text-white">{I("M5 12h.01M12 12h.01M19 12h.01", false)}</span>More
          </motion.button>
        )}
      </div>
    </BottomSheet>
  );
}
