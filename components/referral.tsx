"use client";
import { useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useSession } from "./providers";
import { useApi } from "@/lib/client-api";
import type { RefStatus } from "@/lib/config";

const S = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

/** Animated gift icon (lid bobs, sparkles twinkle). */
export function GiftIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...S} aria-hidden>
      <rect x="4" y="11" width="16" height="9.5" rx="2" />
      <path d="M12 11v9.5" />
      <motion.g style={{ originX: "12px", originY: "9px" }}>
        <rect x="3" y="7.5" width="18" height="3.5" rx="1.2" />
        <path d="M12 7.5C10.5 4 7 4 7 6s3 1.5 5 1.5M12 7.5C13.5 4 17 4 17 6s-3 1.5-5 1.5" />
      </motion.g>
      <motion.path d="M20.5 3.5v2M19.5 4.5h2" />
    </svg>
  );
}
export function UsersIcon({ size = 20 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" {...S} aria-hidden><circle cx="9" cy="8" r="3.5" /><path d="M3 20a6 6 0 0 1 12 0" /><motion.g><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a5.5 5.5 0 0 1 3 5" /></motion.g></svg>;
}
export function CheckBadgeIcon({ size = 20 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" {...S} aria-hidden><motion.path d="M12 2.5l2.4 1.8 3-.2.9 2.9 2.4 1.8-1 2.8 1 2.8-2.4 1.8-.9 2.9-3-.2L12 21.5l-2.4-1.8-3 .2-.9-2.9-2.4-1.8 1-2.8-1-2.8 2.4-1.8.9-2.9 3 .2z" animate={{ rotate: 360 }} transition={{ duration: 18, repeat: 0, ease: "linear" }} style={{ originX: "12px", originY: "12px" }} /><motion.path d="M8.5 12.2l2.4 2.4 4.6-4.8" /></svg>;
}
export function CoinIcon({ size = 20 }: { size?: number }) {
  return <motion.svg width={size} height={size} viewBox="0 0 24 24" {...S} aria-hidden><circle cx="12" cy="12" r="8.5" /><path d="M8.5 9.5h7l-1.5 1.5h-7zM8.5 14.5h7l-1.5-1.5h-7z" /></motion.svg>;
}
export function LinkIcon({ size = 20 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" {...S} aria-hidden><motion.path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><motion.path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></svg>;
}
export function PulseIcon({ size = 20 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" {...S} aria-hidden><motion.path d="M3 12h4l2-5 4 10 2-5h6" /></svg>;
}
export function ShieldAlertIcon({ size = 20 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" {...S} aria-hidden><path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z" /><motion.path d="M12 8v5M12 16.5v.01" /></svg>;
}
export function CopyIcon({ size = 18 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" {...S} aria-hidden><rect x="8" y="8" width="12" height="12" rx="2.5" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /></svg>;
}
export function ShareIcon({ size = 18 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" {...S} aria-hidden><circle cx="18" cy="5" r="2.5" /><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="19" r="2.5" /><path d="M8.2 10.8l7.6-4.4M8.2 13.2l7.6 4.4" /></svg>;
}
export function LockIcon({ size = 16 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" {...S} aria-hidden><rect x="5" y="10" width="14" height="10" rx="2.5" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>;
}

/** Header entry point. */
export function ReferralButton() {
  return (
    <Link href="/referral" aria-label="Referral">
      <motion.span whileTap={{ scale: 0.95 }}
        className="icon-grad neu-sm relative flex h-10 items-center gap-1.5 rounded-[14px] px-3 text-pink active:shadow-[var(--inset)]">
        <GiftIcon size={18} />
        <span className="hidden text-xs font-semibold text-white min-[400px]:inline">Referral</span>
      </motion.span>
    </Link>
  );
}

const REF_KEY = "shine_ref";
/** Captures ?ref=<username> into localStorage and sends the daily activity ping (attaching the ref once, server-side). */
export function ReferralTracker() {
  const { authenticated, profile, uid } = useSession();
  const api = useApi();
  useEffect(() => {
    try {
      const r = new URLSearchParams(window.location.search).get("ref");
      if (r && /^[A-Za-z0-9_]{1,15}$/.test(r) && !localStorage.getItem(REF_KEY)) localStorage.setItem(REF_KEY, r);
    } catch {}
  }, []);
  useEffect(() => {
    if (!authenticated || !profile || !uid) return;
    let ref: string | null = null, last: string | null = null;
    try { ref = localStorage.getItem(REF_KEY); last = localStorage.getItem(`shine_ping_${uid}`); } catch {}
    const today = new Date().toISOString().slice(0, 10);
    if (last === today && !ref) return;
    api("/api/referral", { action: "ping", ref: ref && ref.toLowerCase() !== profile.usernameLower ? ref : "" })
      .then(() => { try { localStorage.setItem(`shine_ping_${uid}`, today); localStorage.removeItem(REF_KEY); } catch {} })
      .catch(() => {});
  }, [authenticated, profile, uid, api]);
  return null;
}

const STATUS: Record<RefStatus, { label: string; cls: string }> = {
  locked: { label: "Locked", cls: "bg-white/5 text-white/50 ring-white/10" },
  eligible: { label: "Eligible", cls: "bg-emerald-400/10 text-emerald-300 ring-emerald-400/30" },
  requested: { label: "Requested", cls: "bg-amber-400/10 text-amber-300 ring-amber-400/30" },
  review: { label: "Under team review", cls: "bg-sky-400/10 text-sky-300 ring-sky-400/30" },
  approved: { label: "Approved · claim open", cls: "icon-grad neu-sm text-pink ring-pink/40" },
  paid: { label: "Paid", cls: "bg-emerald-400/15 text-emerald-300 ring-emerald-400/40" },
  rejected: { label: "Rejected", cls: "bg-red-500/10 text-red-300 ring-red-500/30" },
};
export function StatusBadge({ s, badge }: { s: RefStatus; badge?: boolean }) {
  const m = STATUS[s];
  return <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[10.5px] font-semibold ring-1 ${m.cls}`}>{s === "locked" && <LockIcon size={11} />}{badge && s === "paid" ? "Granted" : m.label}</span>;
}

