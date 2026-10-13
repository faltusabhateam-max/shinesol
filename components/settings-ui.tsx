"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import type { ReactNode } from "react";

export function Section({ title, children, delay = 0 }: { title: string; children: ReactNode; delay?: number }) {
  return (
    <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }} className="mb-5">
      <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">{title}</p>
      <div className="glass divide-y divide-white/[.06] overflow-hidden rounded-3xl">{children}</div>
    </motion.section>
  );
}
export function Row({ icon, title, sub, href, onClick, right, external, danger }: { icon: ReactNode; title: ReactNode; sub?: ReactNode; href?: string; onClick?: () => void; right?: ReactNode; external?: boolean; danger?: boolean }) {
  const inner = (
    <motion.div whileTap={{ scale: 0.99 }} className="flex items-center gap-3 px-4 py-4 transition hover:bg-white/[.025]">
      <span className={`neu-sm grid h-10 w-10 shrink-0 place-items-center rounded-[14px] ${danger ? "text-red-300" : "icon-grad text-pink"}`}>{icon}</span>
      <div className="min-w-0 flex-1"><p className={`truncate text-[15px] font-medium ${danger ? "text-red-200" : ""}`}>{title}</p>{sub && <p className="truncate text-xs text-white/50">{sub}</p>}</div>
      {right ?? ((href || onClick) && <svg className="text-white/30" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>)}
    </motion.div>
  );
  if (href) return external ? <a href={href} target="_blank" rel="noopener noreferrer" className="block">{inner}</a> : <Link href={href} className="block">{inner}</Link>;
  if (onClick) return <button type="button" onClick={onClick} className="block w-full text-left">{inner}</button>;
  return inner;
}
export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} className={`relative h-7 w-12 shrink-0 rounded-full transition ${on ? "grad" : "neu-inset"}`}>
      <motion.span layout transition={{ type: "spring", stiffness: 500, damping: 30 }} className={`absolute top-1 h-5 w-5 rounded-full bg-[#f4f4f6] shadow ${on ? "right-1" : "left-1"}`} />
    </button>
  );
}
const P = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
export const SI = {
  user: <svg {...P}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>,
  badge: <svg {...P}><path d="M12 2.5 14.5 4l3-.2.9 2.9 2.5 1.8-1 2.9 1 3-2.5 1.8-.9 2.9-3-.2L12 21.5 9.5 20l-3 .2-.9-2.9L3.1 15.5l1-3-1-2.9 2.5-1.8.9-2.9 3 .2z" /><path d="m8.5 12 2.4 2.4 4.6-4.8" /></svg>,
  vault: <svg {...P}><rect x="3" y="5" width="18" height="15" rx="3" /><circle cx="12" cy="12.5" r="3" /></svg>,
  list: <svg {...P}><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></svg>,
  bell: <svg {...P}><path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8" /><path d="M10 21a2 2 0 0 0 4 0" /></svg>,
  lock: <svg {...P}><rect x="5" y="10" width="14" height="10" rx="2.5" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>,
  shield: <svg {...P}><path d="M12 3 4 6v6c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V6z" /></svg>,
  info: <svg {...P}><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></svg>,
  help: <svg {...P}><path d="M4 12a8 8 0 1 1 3.3 6.5L4 20l1-3.6A8 8 0 0 1 4 12z" /><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5M12 16h.01" /></svg>,
  out: <svg {...P}><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M15 12H3" /></svg>,
  wallet: <svg {...P}><rect x="3" y="6" width="18" height="14" rx="3" /><path d="M16 13h2M3 10h18" /></svg>,
  eye: <svg {...P}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg>,
  gear: <svg {...P}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></svg>,
};
