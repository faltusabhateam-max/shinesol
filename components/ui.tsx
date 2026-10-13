"use client";
import { LIcon } from "./line-icons";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import type { ReactNode, ButtonHTMLAttributes } from "react";
import { avatarSrc } from "@/lib/config";

export function StarLoader({ size = 56, label }: { size?: number; label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3" role="status" aria-label={label || "Loading"}>
      <div className="neu relative grid place-items-center rounded-full" style={{ width: size + 16, height: size + 16 }}>
        <motion.svg className="absolute inset-0" viewBox="0 0 100 100" animate={{ rotate: 360 }} transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }} aria-hidden>
          <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,.06)" strokeWidth="4" />
          <circle cx="50" cy="50" r="44" fill="none" stroke="url(#shine-grad)" strokeWidth="4" strokeLinecap="round" strokeDasharray="70 207" />
        </motion.svg>
        <img src="/brand/star-192.png" alt="" style={{ width: size * 0.55, height: size * 0.55 }} />
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
      <img src="/brand/star-192.png" alt="Shine" width={size} height={size} />
      {withText && <span className="font-display text-xl font-bold tracking-tight">Shine</span>}
    </span>
  );
}

export function Avatar({ avatar, size = 44, ring = false, className = "" }: { avatar?: string | null; size?: number; ring?: boolean; className?: string }) {
  return (
    <img src={avatarSrc(avatar)} alt="" width={size} height={size}
      className={`shrink-0 rounded-full object-cover ${ring ? "ring-2 ring-[#3a3a3e] shadow-[var(--raise-sm)]" : "border border-white/5"} ${className}`}
      style={{ width: size, height: size }} />
  );
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "pink" | "glass" | "ghost" | "danger"; loading?: boolean; size?: "sm" | "md" | "lg" };
export function Button({ variant = "pink", loading, size = "md", className = "", children, disabled, ...rest }: BtnProps) {
  const base = "relative inline-flex items-center justify-center gap-2 rounded-[18px] font-semibold tracking-wide transition active:scale-[.97] disabled:opacity-50 disabled:active:scale-100 select-none";
  const sizes = { sm: "px-3.5 py-2 text-sm", md: "px-5 py-3 text-sm", lg: "px-6 py-4 text-base" }[size];
  const v = {
    pink: "btn-pink text-white hover:brightness-110",
    glass: "neu-sm text-white/90 hover:text-white active:shadow-[var(--inset)]",
    ghost: "text-white/75 hover:text-white active:shadow-[var(--inset)]",
    danger: "neu-sm text-red-300 hover:text-red-200 active:shadow-[var(--inset)]",
  }[variant];
  return (
    <button type="button" className={`${base} ${sizes} ${v} ${className}`} disabled={disabled || loading} {...rest}>
      {loading && <motion.span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.9, ease: "linear" }} />}
      {children}
    </button>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`glass rounded-[22px] ${className}`}>{children}</div>;
}

export function PageTitle({ children, right, sub }: { children: ReactNode; right?: ReactNode; sub?: ReactNode }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <div>
        <motion.h1 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="font-display text-[28px] font-bold leading-tight tracking-tight">{children}</motion.h1>
        {sub && <p className="mt-1 text-sm text-white/55">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

export function Empty({ title, text, action }: { title: string; text?: string; action?: ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass flex flex-col items-center rounded-[22px] px-6 py-12 text-center">
      <span className="neu-inset mb-4 grid h-16 w-16 place-items-center rounded-[22px]"><img src="/brand/star-192.png" alt="" className="h-8 w-8 opacity-80" /></span>
      <h3 className="font-display text-lg font-bold">{title}</h3>
      {text && <p className="mt-1 max-w-sm text-sm text-white/55">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </motion.div>
  );
}

export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="neu-inset relative flex rounded-[18px] p-1.5">
      {options.map((o) => (
        <button key={o.value} onClick={() => onChange(o.value)} className="relative min-w-0 flex-1 rounded-[14px] px-3 py-2.5 text-sm font-semibold">
          {value === o.value && <motion.span layoutId={`seg-${options.map((x) => x.value).join("-")}`} className="grad absolute inset-0 rounded-[14px]" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
          <span className={`relative ${value === o.value ? "text-white" : "text-white/55"}`}>{o.label}</span>
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
          <div className="absolute inset-0 bg-black/60" onClick={onClose} />
          <motion.div initial={{ y: 60, opacity: 0, scale: 0.98 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 60, opacity: 0 }} transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className={`glass-strong relative w-full overflow-y-auto rounded-t-[28px] p-5 sm:max-w-lg sm:rounded-[24px] ${full ? "h-[92vh] sm:h-auto sm:max-h-[90vh]" : "max-h-[88vh]"}`}>
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/15 sm:hidden" />
            {title && (
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-display text-lg font-bold">{title}</h3>
                <button onClick={onClose} aria-label="Close" className="neu-sm grid h-9 w-9 place-items-center rounded-[12px] text-white/60 hover:text-white active:shadow-[var(--inset)]">
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
    <Link href={href} className="mb-4 inline-flex items-center gap-2 text-sm text-white/60 hover:text-white">
      <span className="neu-sm grid h-8 w-8 place-items-center rounded-[10px]"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg></span>
      {label}
    </Link>
  );
}

export function StatusPill({ status }: { status: "pending" | "approved" | "rejected" | "open" | "closed" }) {
  const map = {
    pending: "text-amber-200",
    approved: "text-emerald-300",
    rejected: "text-red-300",
    open: "text-pink-soft",
    closed: "text-white/55",
  }[status];
  const label = { pending: "Pending", approved: "Approved", rejected: "Rejected", open: "Open", closed: "Closed" }[status];
  return <span className={`inline-flex items-center gap-1.5 neu-inset rounded-full px-2.5 py-1 text-xs font-semibold ${map}`}>
    {status === "pending" ? <LIcon name="clock" size={13} /> : status === "approved" ? <LIcon name="check" size={13} /> : status === "rejected" ? <LIcon name="x" size={13} animate={false} />
      : <span className={`h-1.5 w-1.5 rounded-full ${status === "open" ? "dot-grad" : "bg-white/40"}`} />}{label}</span>;
}

/** Neumorphic progress ring with the Shine gradient. */
export function ProgressRing({ pct, size = 132, stroke = 9, children }: { pct: number; size?: number; stroke?: number; children?: ReactNode }) {
  const r = (size - stroke) / 2 - 6, c = 2 * Math.PI * r;
  return (
    <div className="neu relative grid shrink-0 place-items-center rounded-full" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(0,0,0,.28)" strokeWidth={stroke} data-keep-stroke />
        <motion.circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="url(#shine-grad)" strokeWidth={stroke} strokeLinecap="round" data-keep-stroke
          strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - Math.min(100, Math.max(0, pct)) / 100) }} transition={{ duration: 1.1, ease: "easeOut" }} />
      </svg>
      <div className="relative text-center">{children}</div>
    </div>
  );
}
