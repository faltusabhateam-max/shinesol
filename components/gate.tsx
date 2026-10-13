"use client";
import { motion } from "framer-motion";
import Link from "next/link";
import type { ReactNode } from "react";
import { useSession } from "./providers";
import { Button, Card, FullLoader } from "./ui";
import { useFlags } from "./flags";

export function SignInGate({ text = "Sign in with your email to create your Shine profile and wallet." }: { text?: string }) {
  const { login } = useSession();
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass mx-auto mt-6 max-w-md rounded-[2rem] p-8 text-center">
      <motion.img src="/brand/star.png" alt="" className="mx-auto h-20 w-20" />
      <h2 className="mt-5 font-display text-2xl font-bold">Welcome to Shine</h2>
      <p className="mt-2 text-sm text-white/60">{text}</p>
      <Button size="lg" className="mt-6 w-full" onClick={login}>Sign in or sign up</Button>
      <p className="mt-3 text-xs text-white/40">A Solana wallet is created for you automatically. Shine never holds your private key.</p>
    </motion.div>
  );
}


export function DeactivatedScreen() {
  const { logout } = useSession();
  return (
    <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="glass mx-auto mt-6 max-w-md rounded-[2rem] p-8 text-center">
      <div className="relative mx-auto h-20 w-20">
        <div className="relative grid h-20 w-20 place-items-center rounded-full border border-red-400/40 bg-red-500/10 text-red-300">
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9" /><path d="M5.6 5.6l12.8 12.8" /></svg>
        </div>
      </div>
      <h2 className="mt-5 font-display text-2xl font-bold">Account deactivated</h2>
      <p className="mt-2 text-sm leading-relaxed text-white/60">Your Shine account has been deactivated by our moderation team. You can't post, apply or chat while it's deactivated. If you believe this is a mistake, contact Shine Support.</p>
      <Link href="/chat/support"><Button size="lg" className="mt-6 w-full">Contact Shine Support</Button></Link>
      <button onClick={() => logout()} className="mt-3 text-sm text-white/50 hover:text-white">Sign out</button>
    </motion.div>
  );
}

/** Ensures the visitor is signed in, the secure session is ready and a profile exists. */
export function SessionGate({ children, needProfile = true, text, allowDeactivated = false }: { children: ReactNode; needProfile?: boolean; text?: string; allowDeactivated?: boolean }) {
  const s = useSession();
  const { deactivated } = useFlags();
  if (!s.ready) return <FullLoader />;
  if (!s.authenticated) return <SignInGate text={text} />;
  if (s.authError) return <Card className="p-6 text-center"><p className="text-red-200">{s.authError}</p><Button className="mt-4" onClick={() => location.reload()}>Try again</Button></Card>;
  if (!s.fbReady || !s.profileLoaded) return <FullLoader label="Securing your session…" />;
  if (!allowDeactivated && s.uid && deactivated.has(s.uid)) return <DeactivatedScreen />;
  if (needProfile && !s.profile)
    return (
      <Card className="mx-auto mt-6 max-w-md p-8 text-center">
        <h2 className="font-display text-xl font-bold">Complete your profile first</h2>
        <p className="mt-2 text-sm text-white/60">Set up your Shine profile to apply, chat and get paid.</p>
        <Link href="/profile"><Button className="mt-5 w-full">Set up profile</Button></Link>
      </Card>
    );
  return <>{children}</>;
}
