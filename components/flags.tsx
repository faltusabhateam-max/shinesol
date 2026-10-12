"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { fb } from "@/lib/firebase";
import { C, SHINE_OFFICIAL_USERNAME } from "@/lib/config";

type Aff = { p: string; u: string };
type Flags = { verified: Set<string>; official: Set<string>; deactivated: Set<string>; loaded: boolean; paidUntil: Record<string, Date>; affiliates: Record<string, Aff>; isVerified: (uid: string) => boolean; affiliateOf: (uid: string) => Aff | null };
const empty: Flags = { verified: new Set(), official: new Set(), deactivated: new Set(), loaded: false, paidUntil: {}, affiliates: {}, isVerified: () => false, affiliateOf: () => null };
const Ctx = createContext<Flags>(empty);
export const useFlags = () => useContext(Ctx);

/** Live moderation flags (verified projects, deactivated accounts). Only Shine's server can write them. */
export function FlagsProvider({ children }: { children: ReactNode }) {
  const [f, setF] = useState<Flags>(empty);
  const [raw, setRaw] = useState<any>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const { db } = fb();
    return onSnapshot(doc(db, C.meta, "flags"), (s) => setRaw(s.data() || {}), () => setRaw({}));
  }, []);
  useEffect(() => { const t = setInterval(() => setTick((x) => x + 1), 60_000); return () => clearInterval(t); }, []);
  useEffect(() => {
    if (!raw) return;
    // Admin-granted badges are permanent; paid "Shine Verified" badges expire automatically.
    const paidUntil: Record<string, Date> = {};
    Object.entries(raw.verifiedUntil || {}).forEach(([k, v]: any) => { const d = v?.toDate ? v.toDate() : new Date(v); if (d.getTime() > Date.now()) paidUntil[k] = d; });
    const verified = new Set<string>([...(raw.verified || []), ...Object.keys(paidUntil)]);
    const official = new Set<string>(raw.verified || []);
    const affiliates: Record<string, Aff> = raw.affiliates || {};
    // An affiliate badge lives only while the granting project's Verified plan is active.
    const affiliateOf = (u: string) => { const a = affiliates[u]; return a && verified.has(a.p) ? a : null; };
    setF({ verified, official, deactivated: new Set(raw.deactivated || []), loaded: true, paidUntil, affiliates, isVerified: (u) => verified.has(u), affiliateOf });
  }, [raw, tick]);
  return <Ctx.Provider value={f}>{children}</Ctx.Provider>;
}

const avatarCache = new Map<string, Promise<string | null>>();
function useAvatar(uid?: string | null) {
  const [a, setA] = useState<string | null>(null);
  useEffect(() => {
    if (!uid) return;
    if (!avatarCache.has(uid)) avatarCache.set(uid, getDoc(doc(fb().db, C.users, uid)).then((d) => (d.data()?.avatar as string) || null).catch(() => null));
    let on = true; avatarCache.get(uid)!.then((v) => on && setA(v)); return () => { on = false; };
  }, [uid]);
  return a;
}
function Seal({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path fill="#ff2fa6" d="M12 1.5l2.6 1.9 3.2-.2 1 3.1 2.6 1.9-1 3.1 1 3.1-2.6 1.9-1 3.1-3.2-.2L12 22.5l-2.6-1.9-3.2.2-1-3.1-2.6-1.9 1-3.1-1-3.1 2.6-1.9 1-3.1 3.2.2z" />
      <path d="M7.8 12.3l2.7 2.7 5.7-5.8" fill="none" stroke="#fff" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
const pop = { initial: { scale: 0, rotate: -30 }, animate: { scale: 1, rotate: 0 }, transition: { type: "spring" as const, stiffness: 400, damping: 15 } };
/** Small square badge that links somewhere without nesting <a> tags inside cards. */
function LinkBadge({ href, title, size, children }: { href: string; title: string; size: number; children: ReactNode }) {
  const r = useRouter();
  return (
    <motion.span {...pop} role="link" tabIndex={0} title={title} aria-label={title}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); r.push(href); }}
      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); r.push(href); } }}
      className="inline-flex shrink-0 cursor-pointer overflow-hidden rounded-[5px] ring-1 ring-white/20 hover:ring-[#ff2fa6]" style={{ width: size, height: size }}>
      {children}
    </motion.span>
  );
}

/**
 * Identity badges next to a name:
 *  - Shine-team official (admin-granted): Shine logo affiliate badge → @ShineSol_, plus the verified seal.
 *  - Paid Shine Verified: verified seal.
 *  - Project affiliate: the project's avatar → that project's profile.
 * Pass `force` to always show the seal (e.g. Shine Support).
 */
export function VerifiedBadge({ uid, force, size = 16, className = "" }: { uid?: string | null; force?: boolean; size?: number; className?: string }) {
  const { verified, official, affiliateOf } = useFlags();
  const aff = uid ? affiliateOf(uid) : null;
  const avatar = useAvatar(aff?.p);
  const isOfficial = !!uid && official.has(uid);
  const seal = force || (!!uid && verified.has(uid));
  if (!seal && !aff) return null;
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 ${className}`}>
      {seal && (
        <motion.span {...pop} title={isOfficial ? "Officially verified by the Shine team" : "Shine Verified"} aria-label="Verified" className="inline-flex shrink-0 drop-shadow-[0_0_6px_rgba(255,47,166,.7)]">
          <Seal size={size} />
        </motion.span>
      )}
      {isOfficial && (
        <LinkBadge href={`/u/${SHINE_OFFICIAL_USERNAME}`} title="Shine team — official" size={size}>
          <img src="/brand/star-64.png" alt="" className="h-full w-full bg-black object-contain p-[1px]" />
        </LinkBadge>
      )}
      {aff && !isOfficial && (
        <LinkBadge href={`/u/${aff.u}`} title={`Affiliated with @${aff.u}`} size={size}>
          {avatar ? <img src={avatar} alt="" className="h-full w-full object-cover" /> : <span className="h-full w-full bg-[#ff2fa6]/40" />}
        </LinkBadge>
      )}
    </span>
  );
}
