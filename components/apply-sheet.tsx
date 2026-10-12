"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import type { Post } from "@/lib/types";
import { useSession } from "./providers";
import { useFlags, VerifiedBadge } from "./flags";
import { BottomSheet } from "./bottom-sheet";
import { Avatar, Button } from "./ui";
import { SocialRow } from "./social";
import { StatusOverlay, errorKind, friendlyError } from "./status";
import { useShineWallet } from "@/lib/client-api";
import { submitApplication, socialsOf, displayName } from "@/lib/db";
import { short } from "@/lib/format";
import { normalizeLinks } from "@/lib/handles";
import { StepFlow } from "./step-flow";
import { AnimatePresence } from "framer-motion";

const DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === "1";

/** One-tap apply: attaches the applicant's Shine profile, socials and wallet + optional pitch & portfolio, then a wallet signature. */
export function ApplySheet({ post, open, onClose, onDone }: { post: Post; open: boolean; onClose: () => void; onDone?: () => void }) {
  const { profile, uid, address, login, authenticated } = useSession();
  const { isVerified } = useFlags();
  const { sign } = useShineWallet();
  const [pitch, setPitch] = useState("");
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ kind: "success" | "failed" | "denied"; title: string; msg?: string } | null>(null);
  useEffect(() => { if (open && !authenticated) { onClose(); login(); } }, [open, authenticated, login, onClose]);
  const linkOk = !link.trim() || /^https?:\/\/\S+\.\S+/.test(link.trim()) || /^[\w-]+(\.[\w-]+)+\S*$/.test(link.trim());
  const verified = uid ? isVerified(uid) : false;

  const hasSteps = !!post.steps?.length;
  const submit = async (stepAnswers?: Record<string, string>) => {
    if (!profile || !uid || !address || (!stepAnswers && !linkOk)) return;
    setBusy(true);
    const portfolio = link.trim() ? (/^https?:\/\//.test(link.trim()) ? link.trim() : `https://${link.trim()}`) : "";
    const message = [
      "Shine — Application",
      `Post: ${post.id}`,
      `Project: ${post.projectName}`,
      `Applicant: @${profile.username}`,
      `Payout wallet: ${address}`,
      `Issued: ${new Date().toISOString()}`,
      "",
      "By signing, I apply with my Shine profile and confirm this wallet as my payout address. This signature does not authorize any transaction.",
    ].join("\n");
    try {
      const signature = await sign(message, {
        title: "Sign to apply", subtitle: `Send your Shine profile to ${post.projectName}.`,
        rows: [["Opportunity", post.projectName], ["Payout wallet", <span key="w" className="font-mono">{short(address, 6)}</span>]], confirmLabel: "Sign & apply",
      });
      const s = socialsOf(profile);
      const answers: Record<string, string> = stepAnswers ? { ...stepAnswers } : { kind: "profile" };
      if (pitch.trim()) answers.pitch = normalizeLinks(pitch.trim()).slice(0, 600);
      if (portfolio) answers.portfolio = portfolio.slice(0, 300);
      if (s.x) answers.x = s.x; if (s.telegram) answers.telegram = s.telegram; if (s.discord) answers.discord = s.discord.slice(0, 200);
      if (verified) answers.verified = "true";
      await submitApplication({
        postId: post.id, projectUid: post.authorUid, projectName: post.projectName, applicantUid: uid, applicantUsername: profile.username, applicantAvatar: profile.avatar.length < 300 ? profile.avatar : "custom",
        answers, wallet: address, signature, signedMessage: message, postExcerpt: post.text.slice(0, 120),
      });
      setStatus({ kind: "success", title: "Application sent", msg: `${post.projectName} received your profile. Track the status in Register.` });
      setPitch(""); setLink(""); onDone?.();
    } catch (e) {
      const k = errorKind(e);
      setStatus({ kind: k, title: k === "denied" ? "Signature declined" : "Couldn't apply", msg: k === "denied" ? "A wallet signature is required to apply." : friendlyError(e) });
    }
    setBusy(false);
  };

  return (
    <>
      <AnimatePresence>{hasSteps && open && !!authenticated && !status && profile && (
        <StepFlow steps={post.steps!} projectName={post.projectName} projectAvatar={post.authorAvatar} busy={busy} onClose={() => !busy && onClose()} onSubmit={(a) => submit(a)} />
      )}</AnimatePresence>
      <BottomSheet open={open && !!authenticated && !status && (!hasSteps || !profile)} onClose={() => !busy && onClose()} title={`Apply to ${post.projectName}`}>
        {!profile && !DEMO ? (
          <div className="space-y-3 pb-3 text-center"><p className="text-sm text-white/60">Create your Shine profile first — it's what projects see when you apply.</p><Link href="/profile"><Button className="w-full">Set up profile</Button></Link></div>
        ) : profile && (
          <div className="space-y-4 pb-3">
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`relative overflow-hidden rounded-3xl border p-4 ${verified ? "border-pink/50 bg-pink/[.07]" : "border-white/10 bg-white/[.03]"}`}>
              <motion.div className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-pink/25 blur-3xl" animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 3.5 }} />
              <p className="relative mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-pink">Attached automatically</p>
              <div className="relative flex items-center gap-3">
                <Avatar avatar={profile.avatar} size={48} ring />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1 min-w-0 font-semibold"><span className="truncate">{displayName(profile)}</span>{uid && <VerifiedBadge uid={uid} size={14} />}</p>
                  <p className="truncate text-sm text-white/50">@{profile.username}</p>
                </div>
                <span className="rounded-full bg-white/10 px-2.5 py-1 font-mono text-[11px] text-white/70">{short(address || "", 4)}</span>
              </div>
              <div className="relative mt-3"><SocialRow s={socialsOf(profile)} size="sm" /></div>
            </motion.div>
            <div>
              <label className="label" htmlFor="pitch">Short pitch <span className="font-normal text-white/40">· optional</span></label>
              <textarea id="pitch" className="input min-h-24 resize-none" maxLength={600} placeholder={`Why you're a great fit for ${post.projectName}…`} value={pitch} onChange={(e) => setPitch(e.target.value)} />
              <p className="mt-1 text-right text-[11px] text-white/35">{pitch.length}/600</p>
            </div>
            <div>
              <label className="label" htmlFor="pf">Portfolio link <span className="font-normal text-white/40">· optional</span></label>
              <input id="pf" className="input" inputMode="url" placeholder="https://your-portfolio.xyz" value={link} onChange={(e) => setLink(e.target.value)} />
              {!linkOk && <p className="mt-1 text-xs text-red-300">Enter a valid link.</p>}
            </div>
            <Button size="lg" className="w-full" loading={busy} disabled={!linkOk || !address} onClick={() => submit()}>Sign & apply</Button>
            <p className="text-center text-[11px] text-white/40">Your wallet signature proves it's you. It never moves funds.</p>
          </div>
        )}
      </BottomSheet>
      <StatusOverlay kind={status?.kind ?? null} title={status?.title} message={status?.msg} onClose={() => { setStatus(null); onClose(); }} />
    </>
  );
}
