"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { useSession } from "./providers";
import { Avatar, Button, Logo } from "./ui";
import { SI } from "./settings-ui";
import { ReferralButton, ReferralTracker } from "./referral";
import { ChatIcon, EventsIcon, HomeIcon, RegisterIcon, ReviewIcon, TasksIcon, WalletIcon } from "./icons";

function Header() {
  const { authenticated, profile, login, ready } = useSession();
  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div className="glass-strong border-x-0 border-t-0">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4">
          <Link href="/" aria-label="Shine home"><Logo size={30} /></Link>
          <div className="flex items-center gap-1.5 min-[360px]:gap-2">
          <ReferralButton />
          {!ready ? <div className="skeleton h-9 w-9 rounded-full" /> : authenticated ? (
            <div className="flex items-center gap-1.5 min-[360px]:gap-2">
            <Link href="/settings" aria-label="Settings"><motion.span whileHover={{ rotate: 60 }} whileTap={{ scale: 0.9 }} className="grid h-9 w-9 place-items-center rounded-full text-white/70 hover:bg-white/10 hover:text-white">{SI.gear}</motion.span></Link>
            <Link href="/profile" aria-label="Your profile">
              <motion.div whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }} className="rounded-full">
                <Avatar avatar={profile?.avatar} size={38} ring />
              </motion.div>
            </Link>
            </div>
          ) : (
            <Button size="sm" onClick={login}>Sign in</Button>
          )}
          </div>
        </div>
      </div>
    </header>
  );
}

function BottomNav() {
  const path = usePathname();
  const { profile } = useSession();
  const isProject = profile?.role === "project";
  const items = [
    { href: "/", label: "Home", Icon: HomeIcon, match: (p: string) => p === "/" },
    { href: "/events", label: "Events", Icon: EventsIcon, match: (p: string) => p.startsWith("/events") || p.startsWith("/p/") || p.startsWith("/apply") || p.startsWith("/u/") },
    { href: "/tasks", label: "Tasks", Icon: TasksIcon, match: (p: string) => p.startsWith("/tasks") },
    { href: "/register", label: isProject ? "Review" : "Register", Icon: isProject ? ReviewIcon : RegisterIcon, match: (p: string) => p.startsWith("/register") },
    { href: "/chat", label: "Chat", Icon: ChatIcon, match: (p: string) => p.startsWith("/chat") },
    { href: "/wallet", label: "Wallet", Icon: WalletIcon, match: (p: string) => p.startsWith("/wallet") },
  ];
  return (
    <nav className="safe-bottom pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-3">
      <div className="glass-strong pointer-events-auto flex w-full max-w-md items-center justify-between rounded-[1.75rem] px-1 py-1.5 shadow sm:px-2 sm:py-2-[0_20px_60px_-15px_rgba(255,47,166,.35)]">
        {items.map(({ href, label, Icon, match }) => {
          const active = match(path);
          return (
            <Link key={href} href={href} className="relative flex min-w-0 flex-1 flex-col items-center gap-0.5 py-1.5" aria-current={active ? "page" : undefined}>
              {active && <motion.span layoutId="nav-pill" className="absolute inset-0 rounded-2xl bg-pink/15 ring-1 ring-pink/40" transition={{ type: "spring", stiffness: 420, damping: 32 }} />}
              <motion.span className={`relative ${active ? "text-pink drop-shadow-[0_0_8px_rgba(255,47,166,.8)]" : "text-white/60"}`} animate={active ? { scale: [1, 1.18, 1] } : { scale: 1 }} transition={{ duration: 0.35 }} whileTap={{ scale: 0.85 }}>
                <span className="block scale-[.88] min-[380px]:scale-100"><Icon active={active} /></span>
              </motion.span>
              <span className={`relative max-w-full truncate text-[9.5px] font-semibold min-[380px]:text-[10.5px] ${active ? "text-white" : "text-white/50"}`}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export default function AppShell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const immersive = path.startsWith("/chat/");
  if (path.startsWith("/admin")) return <>{children}</>;
  return (
    <>
      <Header />
      <ReferralTracker />
      <main className={`mx-auto w-full max-w-3xl px-4 pt-20 ${immersive ? "pb-4" : "pb-32"}`}>{children}</main>
      {!immersive && <BottomNav />}
    </>
  );
}
