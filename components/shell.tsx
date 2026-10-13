"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { useSession } from "./providers";
import { Avatar, Button, Logo } from "./ui";
import { SI } from "./settings-ui";
import { ReferralButton, ReferralTracker } from "./referral";
import { House as HomeIcon, CalendarDays as EventsIcon, ListChecks as TasksIcon, ClipboardList as RegisterIcon, ClipboardCheck as ReviewIcon, MessageCircle as ChatIcon, Wallet as WalletIcon } from "lucide-react";

function Header() {
  const { authenticated, profile, login, ready } = useSession();
  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div className="bg-[#2b2b2e]/95 shadow-[0_8px_18px_-10px_rgba(10,10,12,.8)]">
        <div className="mx-auto flex h-[68px] max-w-3xl items-center justify-between px-4">
          <Link href="/" aria-label="Shine home"><Logo size={30} /></Link>
          <div className="flex items-center gap-1.5 min-[360px]:gap-2">
          <ReferralButton />
          {!ready ? <div className="skeleton h-9 w-9 rounded-full" /> : authenticated ? (
            <div className="flex items-center gap-1.5 min-[360px]:gap-2">
            <Link href="/settings" aria-label="Settings"><motion.span whileTap={{ scale: 0.94 }} className="icon-grad neu-sm grid h-10 w-10 place-items-center rounded-[14px] active:shadow-[var(--inset)]">{SI.gear}</motion.span></Link>
            <Link href="/profile" aria-label="Your profile">
              <motion.div whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }} className="rounded-full">
                <Avatar avatar={profile?.avatar} size={40} ring />
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
    <nav aria-label="Primary" className="safe-bottom pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-3">
      <div className="glass-strong pointer-events-auto flex w-full max-w-md items-center justify-between gap-0.5 rounded-[26px] p-1.5 min-[380px]:p-2">
        {items.map(({ href, label, Icon, match }) => {
          const active = match(path);
          return (
            <Link key={href} href={href} className="relative flex min-w-0 flex-1 flex-col items-center gap-1 py-1" aria-current={active ? "page" : undefined}>
              <motion.span whileTap={{ scale: 0.92 }} className={`relative grid h-9 w-9 place-items-center rounded-[13px] transition-colors min-[380px]:h-10 min-[380px]:w-10 ${active ? "text-white" : "text-white/55"}`}>
                {active && <motion.span layoutId="nav-pill" className="grad absolute inset-0 rounded-[13px]" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
                <Icon className="relative" size={20} strokeWidth={1.6} />
              </motion.span>
              <span className={`relative max-w-full truncate text-[9.5px] font-medium min-[380px]:text-[10.5px] ${active ? "text-white" : "text-white/50"}`}>{label}</span>
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
      <main className={`mx-auto w-full max-w-3xl px-4 pt-[88px] ${immersive ? "pb-4" : "pb-32"}`}>{children}</main>
      {!immersive && <BottomNav />}
    </>
  );
}
