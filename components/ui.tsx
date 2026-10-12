"use client";
import { LIcon } from "./line-icons";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import type { ReactNode, ButtonHTMLAttributes } from "react";
import { avatarSrc } from "@/lib/config";

export function StarLoader({ size = 56, label }: { size?: number; label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3" role="status" aria-label={label || "Loading"}>
      <div className="relative" style={{ width: size, height: size }}>
        <motion.div className="absolute inset-0 rounded-full" style={{ background: "radial-gradient(circle, rgba(255,47,166,.55), transparent 65%)" }}
          animate={{ scale: [0.8, 1.35, 0.8], opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }} />
        <motion.img src="/brand/star-192.png" alt="" className="absolute inset-0 h-full w-full drop-shadow-[0_0_14px_rgba(255,47,166,.9)]"
          animate={{ rotate: [0, 90, 180], scale: [1, 0.82, 1] }} transition={{ duration: 1.6, repeat: Infinity, ease: [0.65, 0, 0.35, 1] }} />
      </div>
      {label && <p className="text-sm text-white/60">{label}</p>}
    </div>
  );
}

export function FullLoader({ label }: { label?: string }) {
  return <div className="flex min-h-[50vh] items-center justify-center"><StarLoader size={64} label={label} /></div>;
}

export function Logo({ size = 30, withText = true }: { size?: number; withText?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <motion.img src="/brand/star-192.png" alt="Shine" width={size} height={size} className="drop-shadow-[0_0_10px_rgba(255,47,166,.75)]"
        whileHover={{ rotate: 45, scale: 1.1 }} transition={{ type: "spring", stiffness: 300, damping: 14 }} />
      {withText && <span className="font-display text-xl font-semibold tracking-tight">Shine</span>}
    </span>
  );
}

export function Avatar({ avatar, size = 44, ring = false, className = "" }: { avatar?: string | null; size?: number; ring?: boolean; className?: string }) {
  return (
    <img src={avatarSrc(avatar)} alt="" width={size} height={size}
      className={`shrink-0 rounded-full object-cover ${ring ? "ring-2 ring-pink/80 ring-offset-2 ring-offset-black" : "border border-white/10"} ${className}`}
      style={{ width: size, height: size }} />
  );
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "pink" | "glass" | "ghost" | "danger"; loading?: boolean; size?: "sm" | "md" | "lg" };
export function Button({ variant = "pink", loading, size = "md", className = "", children, disabled, ...rest }: BtnProps) {
  const base = "relative inline-flex items-center justify-center gap-2 rounded-2xl font-semibold transition active:scale-[.97] disabled:opacity-50 disabled:active:scale-100 select-none";
  const sizes = { sm: "px-3 py-1.5 text-sm", md: "px-4 py-2.5 text-sm", lg: "px-5 py-3.5 text-base" }[size];
  const v = {
    pink: "btn-pink text-white hover:brightness-110",
    glass: "glass text-white hover:bg-white/10",
    ghost: "text-white/80 hover:text-white hover:bg-white/5",
    danger: "bg-red-500/15 text-red-200 border border-red-500/30 hover:bg-red-500/25",
  }[variant];
  return (
    <button type="button" className={`${base} ${sizes} ${v} ${className}`} disabled={disabled || loading} {...rest}>
      {loading && <motion.img src="/brand/star-64.png" alt="" className="h-4 w-4" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.9, ease: "linear" }} />}
      {children}
    </button>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`glass rounded-3xl ${className}`}>{children}</div>;
}

export function PageTitle({ children, right, sub }: { children: ReactNode; right?: ReactNode; sub?: ReactNode }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <div>
        <motion.h1 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="font-display text-3xl font-semibold tracking-tight">{children}</motion.h1>
        {sub && <p className="mt-1 text-sm text-white/55">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

export function Empty({ title, text, action }: { title: string; text?: string; action?: ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass flex flex-col items-center rounded-3xl px-6 py-10 text-center">
      <motion.img src="/brand/star-192.png" alt="" className="mb-4 h-12 w-12 opacity-80" animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 3 }} />
      <h3 className="font-display text-lg font-semibold">{title}</h3>
      {text && <p className="mt-1 max-w-sm text-sm text-white/55">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </motion.div>
  );
}

export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="glass relative flex rounded-2xl p-1">
      {options.map((o) => (
        <button key={o.value} onClick={() => onChange(o.value)} className="relative flex-1 rounded-xl px-4 py-2 text-sm font-semibold">
          {value === o.value && <motion.span layoutId={`seg-${options.map((x) => x.value).join("-")}`} className="btn-pink absolute inset-0 rounded-xl" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
          <span className={`relative ${value === o.value ? "text-white" : "text-white/60"}`}>{o.label}</span>
        </button>
      ))}
    </div>
  );
}

export function Sheet({ open, onClose, title, children, full = false }: { open: boolean; onClose: () => void; title?: string; children: ReactNode; full?: boolean }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
          <motion.div initial={{ y: 60, opacity: 0, scale: 0.98 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 60, opacity: 0 }} transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className={`glass-strong relative w-full overflow-y-auto rounded-t-3xl p-5 sm:max-w-lg sm:rounded-3xl ${full ? "h-[92vh] sm:h-auto sm:max-h-[90vh]" : "max-h-[88vh]"}`}>
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/20 sm:hidden" />
            {title && (
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-display text-lg font-semibold">{title}</h3>
                <button onClick={onClose} aria-label="Close" className="rounded-full p-2 text-white/60 hover:bg-white/10 hover:text-white">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
                </button>
              </div>
            )}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function BackLink({ href, label = "Back" }: { href: string; label?: string }) {
  return (
    <Link href={href} className="mb-3 inline-flex items-center gap-1 text-sm text-white/60 hover:text-white">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
      {label}
    </Link>
  );
}

export function StatusPill({ status }: { status: "pending" | "approved" | "rejected" | "open" | "closed" }) {
  const map = {
    pending: "bg-amber-400/15 text-amber-200 border-amber-300/30",
    approved: "bg-emerald-400/15 text-emerald-200 border-emerald-300/30",
    rejected: "bg-red-400/15 text-red-200 border-red-300/30",
    open: "bg-pink/15 text-pink-soft border-pink/40",
    closed: "bg-white/10 text-white/60 border-white/15",
  }[status];
  const label = { pending: "Pending", approved: "Approved", rejected: "Rejected", open: "Open", closed: "Closed" }[status];
  return <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${map}`}>
    {status === "pending" ? <LIcon name="clock" size={13} /> : status === "approved" ? <LIcon name="check" size={13} /> : status === "rejected" ? <LIcon name="x" size={13} animate={false} />
      : <span className={`h-1.5 w-1.5 rounded-full ${status === "open" ? "bg-pink animate-pulse" : "bg-white/50"}`} />}{label}</span>;
}
