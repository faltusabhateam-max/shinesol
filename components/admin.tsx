"use client";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { usePrivy } from "@privy-io/react-auth";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { fb } from "@/lib/firebase";
import { C } from "@/lib/config";
import { useSession } from "./providers";
import { SignInGate } from "./gate";
import { Avatar, Button, Card, FullLoader, Logo } from "./ui";

type AdminCtx = { email: string; agentUid: string; action: (body: Record<string, any>) => Promise<any>; call: (path: string, body: Record<string, any>) => Promise<any> };
const Ctx = createContext<AdminCtx | null>(null);
export const useAdmin = () => useContext(Ctx)!;

const demoMode = () => process.env.NEXT_PUBLIC_DEMO_MODE === "1";

function AdminGate({ children }: { children: ReactNode }) {
  const s = useSession();
  const { getAccessToken } = usePrivy();
  const [state, setState] = useState<{ ok: boolean; email?: string; error?: string } | null>(null);

  useEffect(() => {
    if (!s.ready || !s.authenticated || !s.fbReady) return;
    if (demoMode() && s.email === "demo@shine.app") { setState({ ok: true, email: "admin@shine.app" }); return; }
    (async () => {
      try {
        const token = await getAccessToken();
        const r = await fetch("/api/admin/session", { method: "POST", headers: { authorization: `Bearer ${token}` } });
        const j = await r.json();
        setState(r.ok ? { ok: true, email: j.email } : { ok: false, error: j.error });
      } catch (e: any) { setState({ ok: false, error: e?.message || "Admin check failed." }); }
    })();
  }, [s.ready, s.authenticated, s.fbReady, s.email, getAccessToken]);

  const call = useCallback(async (path: string, body: Record<string, any>) => {
    const token = await getAccessToken();
    const r = await fetch(path, { method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || "Action failed.");
    return j;
  }, [getAccessToken]);
  const action = useCallback(async (body: Record<string, any>) => {
    const token = await getAccessToken();
    const r = await fetch("/api/admin/action", { method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || "Action failed.");
    return j;
  }, [getAccessToken]);

  if (!s.ready) return <FullLoader />;
  if (!s.authenticated) return <div className="px-4 pt-10"><SignInGate text="Sign in with an authorized admin email to open the Shine admin panel." /></div>;
  if (!s.fbReady || !state) return <FullLoader label="Verifying admin access…" />;
  if (!state.ok) return (
    <div className="px-4 pt-16">
      <Card className="mx-auto max-w-md p-8 text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full border border-red-400/40 bg-red-500/10 text-red-300">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="5" y="10" width="14" height="10" rx="2.5" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>
        </div>
        <h2 className="mt-4 font-display text-xl font-bold">Access restricted</h2>
        <p className="mt-2 text-sm text-white/60">{state.error}</p>
        <Link href="/"><Button variant="glass" className="mt-5 w-full">Back to Shine</Button></Link>
      </Card>
    </div>
  );
  return <Ctx.Provider value={{ email: state.email!, agentUid: s.uid!, action, call }}>{children}</Ctx.Provider>;
}

const NAV = [
  { href: "/admin", label: "Dashboard", icon: <path d="M4 13h6V4H4zM14 20h6v-9h-6zM14 4v4h6V4zM4 20h6v-3H4z" /> },
  { href: "/admin/users", label: "Accounts", icon: <><circle cx="9" cy="8" r="3.5" /><path d="M3 20a6 6 0 0 1 12 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a5.5 5.5 0 0 1 3 5" /></> },
  { href: "/admin/posts", label: "Posts", icon: <><rect x="4" y="4" width="16" height="16" rx="3" /><path d="M8 9h8M8 13h8M8 17h5" /></> },
  { href: "/admin/referrals", label: "Referrals", icon: <><rect x="4" y="11" width="16" height="9.5" rx="2" /><path d="M12 11v9.5M3 7.5h18v3.5H3zM12 7.5C10.5 4 7 4 7 6s3 1.5 5 1.5M12 7.5C13.5 4 17 4 17 6s-3 1.5-5 1.5" /></> },
  { href: "/admin/affiliates", label: "Affiliates", icon: <><circle cx="9" cy="8" r="3.5" /><path d="M3 20a6 6 0 0 1 12 0" /><path d="M17 11l1.5 1.5L22 9" /></> },
  { href: "/admin/escrow", label: "Escrow", icon: <><rect x="3" y="6" width="18" height="13" rx="3" /><path d="M3 10h18M7 15h3" /><path d="M8 6V4h8v2" /></> },
  { href: "/admin/tasks", label: "Tasks", icon: <><rect x="3.5" y="8" width="17" height="4" rx="1" /><path d="M5 12v8.5h14V12M12 8v12.5M12 8S10.5 3.5 8 4.5 9 8 12 8zM12 8s1.5-4.5 4-3.5S15 8 12 8z" /></> },
  { href: "/admin/support", label: "Support", icon: <><path d="M4 12a8 8 0 1 1 3.3 6.5L4 20l1-3.6A8 8 0 0 1 4 12z" /><path d="M9 11h6M9 14h4" /></> },
];

function useUnreadSupport() {
  const [n, setN] = useState(0);
  useEffect(() => onSnapshot(query(collection(fb().db, C.support), where("unreadForSupport", "==", true)), (s) => setN(s.size), () => {}), []);
  return n;
}

function Shell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const { email } = useAdmin();
  const { profile } = useSession();
  const unread = useUnreadSupport();
  const active = (h: string) => (h === "/admin" ? path === "/admin" : path.startsWith(h));
  return (
    <div className="min-h-dvh">
      <header className="glass-strong sticky top-0 z-40 border-x-0 border-t-0">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
          <Link href="/admin" className="flex items-center gap-2"><Logo size={28} /><span className="rounded-full bg-pink/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-pink ring-1 ring-pink/40">Admin</span></Link>
          <nav className="ml-4 hidden gap-0.5 md:flex">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className={`relative flex items-center gap-2 rounded-xl px-2.5 py-2 text-sm font-semibold transition ${active(n.href) ? "text-white" : "text-white/55 hover:text-white"}`}>
                {active(n.href) && <motion.span layoutId="admin-nav" className="absolute inset-0 rounded-xl neu-inset" />}
                <svg className="relative" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{n.icon}</svg>
                <span className="relative hidden lg:inline">{n.label}</span>
                {n.label === "Support" && unread > 0 && <span className="relative rounded-full bg-pink px-1.5 text-[10px] font-bold text-white">{unread}</span>}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-right text-xs text-white/50 sm:block">Signed in as<br /><span className="text-white/80">{email}</span></span>
            <Avatar avatar={profile?.avatar} size={34} ring />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 pb-28 pt-6">{children}</main>
      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 pb-2 md:hidden">
        <div className="glass-strong flex w-full max-w-md justify-between rounded-[1.75rem] p-2">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="relative flex flex-1 flex-col items-center gap-0.5 py-1.5">
              {active(n.href) && <motion.span layoutId="admin-nav-m" className="absolute inset-0 rounded-2xl neu-inset" />}
              <svg className={`relative ${active(n.href) ? "text-pink" : "text-white/55"}`} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{n.icon}</svg>
              <span className={`relative text-[10.5px] font-semibold ${active(n.href) ? "text-white" : "text-white/50"}`}>{n.label}</span>
              {n.label === "Support" && unread > 0 && <span className="absolute right-3 top-0.5 rounded-full bg-pink px-1.5 text-[9px] font-bold">{unread}</span>}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}

export function AdminLayoutClient({ children }: { children: ReactNode }) {
  return <AdminGate><Shell>{children}</Shell></AdminGate>;
}

export function StatusChip({ deactivated, verified, role }: { deactivated?: boolean; verified?: boolean; role?: string }) {
  return (
    <span className="flex flex-wrap gap-1">
      {role === "project" && <span className="rounded-full bg-pink/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-pink">Project</span>}
      {verified && <span className="rounded-full bg-sky-400/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-sky-300">Verified</span>}
      {deactivated ? <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-red-300">Deactivated</span>
        : <span className="rounded-full bg-emerald-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-300">Active</span>}
    </span>
  );
}
