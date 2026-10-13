"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { fb } from "@/lib/firebase";
import { C, TELEGRAM_GROUP_URL, TG_URL, X_URL } from "@/lib/config";
import { useSession } from "@/components/providers";
import { useFlags, VerifiedBadge } from "@/components/flags";
import { SessionGate } from "@/components/gate";
import { Avatar, BackLink, Button } from "@/components/ui";
import { Row, Section, SI, Toggle } from "@/components/settings-ui";
import { TelegramIcon, XIcon } from "@/components/icons";
import { EscrowRow, DEMO_PLANS } from "@/components/escrow-list";
import { useMyEscrow } from "@/lib/use-escrow-list";
import { displayName } from "@/lib/db";
import { short } from "@/lib/format";
import { useToast } from "@/components/toast";

const DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === "1";
const PREFS = [
  { k: "applications", t: "Application updates", s: "Approvals, rejections and new applicants" },
  { k: "chat", t: "New chat messages", s: "Messages from projects and creators" },
  { k: "payments", t: "Payments & escrow", s: "Funding, due dates and releases" },
  { k: "mentions", t: "Mentions & replies", s: "When someone @mentions or replies to you" },
  { k: "marketing", t: "Shine news", s: "Product updates and new features" },
] as const;

function Inner() {
  const { profile, uid, email, address, logout } = useSession();
  const { isVerified, paidUntil, verified } = useFlags();
  const router = useRouter();
  const toast = useToast();
  const plans = useMyEscrow(DEMO ? null : uid);
  const list = DEMO ? DEMO_PLANS : plans;
  const [prefs, setPrefs] = useState<Record<string, boolean>>({ applications: true, chat: true, payments: true, mentions: true, marketing: false });
  useEffect(() => { if (uid && !DEMO) getDoc(doc(fb().db, C.prefs, uid)).then((s) => s.exists() && setPrefs((p) => ({ ...p, ...(s.data() as any) }))).catch(() => {}); }, [uid]);
  const setPref = (k: string, v: boolean) => {
    const next = { ...prefs, [k]: v }; setPrefs(next);
    if (uid && !DEMO) setDoc(doc(fb().db, C.prefs, uid), { ...next, updatedAt: serverTimestamp() }, { merge: true }).catch(() => toast("Couldn't save your preference", "err"));
  };
  const v = uid ? isVerified(uid) : false;
  const until = uid ? paidUntil[uid] : undefined;
  const pending = (list || []).filter((p) => p.status === "active" && p.offRequest?.status !== "pending").length;

  return (
    <div className="mx-auto max-w-2xl">
      <BackLink href="/profile" label="Profile" />
      <motion.h1 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-4 font-display text-3xl font-bold">Settings</motion.h1>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass relative mb-5 flex items-center gap-3 overflow-hidden rounded-3xl p-4">
        <Avatar avatar={profile?.avatar} size={54} ring />
        <div className="relative min-w-0 flex-1">
          <p className="flex items-center gap-1 min-w-0 text-lg font-semibold"><span className="truncate">{displayName(profile)}</span>{uid && <VerifiedBadge uid={uid} />}</p>
          <p className="truncate text-sm text-white/50">@{profile?.username} · {profile?.role === "project" ? "Project" : "Creator"}</p>
        </div>
        <Link href="/profile" className="relative"><Button size="sm" variant="glass">Edit</Button></Link>
      </motion.div>

      <Section title="Verification" delay={0.03}>
        <Row icon={SI.badge} href="/verify" title={v ? "Shine Verified" : "Get Verified"}
          sub={v ? (until ? `Active until ${until.toLocaleDateString(undefined, { dateStyle: "medium" })}` : "Granted by the Shine team") : "Boosted visibility, DM projects, priority support and more"}
          right={v ? <span className="rounded-full bg-pink/15 px-2.5 py-1 text-[11px] font-bold text-pink">Active</span> : <span className="rounded-full bg-pink px-2.5 py-1 text-[11px] font-bold text-white">From $15</span>} />
      </Section>

      <Section title="Auto-payments" delay={0.06}>
        {list === null ? <p className="px-4 py-4 text-sm text-white/45">Loading…</p> : !list.length ? (
          <Row icon={SI.vault} title="No auto-payments yet" sub="Projects can enable escrow auto-payment from any approved chat." />
        ) : list.slice(0, 3).map((p, i) => <EscrowRow key={p.id} p={p} uid={uid} i={i} />)}
        <Row icon={SI.list} href="/settings/payments" title="All auto-payments" sub={list ? `${list.length} plan${list.length === 1 ? "" : "s"} · statuses, history and requests` : "Statuses, history and requests"} />
        {profile?.role === "project" && pending > 0 && <Row icon={SI.shield} href="/settings/payments?tab=off" title="Request to turn off" sub="Auto-payment can only be turned off by the Shine team after review" />}
      </Section>

      <Section title="Security" delay={0.09}>
        <Row icon={SI.lock} href="/settings/security" title="Security & 2FA" sub="Chat PIN · Google Authenticator · Fingerprint / Face ID" />
        <Row icon={SI.wallet} href="/wallet" title="Shine Wallet" sub={address ? short(address, 6) : "Loading…"} />
      </Section>

      <Section title="Notifications" delay={0.12}>
        {PREFS.map((p) => <Row key={p.k} icon={SI.bell} title={p.t} sub={p.s} right={<Toggle label={p.t} on={!!prefs[p.k]} onChange={(v) => setPref(p.k, v)} />} />)}
      </Section>

      <Section title="Community" delay={0.15}>
        <Row icon={<XIcon size={16} />} href={X_URL} external title="Shine on X" sub="@ShineSol_" />
        <Row icon={<TelegramIcon size={17} />} href={TG_URL} external title="Shine Channel" sub="t.me/shinesolweb · announcements" />
        <Row icon={<TelegramIcon size={17} />} href={TELEGRAM_GROUP_URL} external title="Shine Community" sub={`${TELEGRAM_GROUP_URL.replace("https://", "")} · official group`} />
      </Section>

      <Section title="Help & about" delay={0.18}>
        <Row icon={SI.help} href="/chat/support" title="Shine Support" sub="Get help or report a scam" />
        <Row icon={SI.info} href="/settings/about" title="About Shine" sub="How Shine works · Built on Solana" />
        <Row icon={SI.info} href="/fees" title="Fees" sub="0.5% project payments · 0.2% withdrawals" />
        <Row icon={SI.info} href="/revenue" title="Revenue & proof" sub="Live on-chain ledger of every Shine fee" />
        <Row icon={SI.info} href="/transparency" title="Transparency" sub="Vault, escrow and how we verify" />
        <Row icon={SI.info} href="/safety" title="Safety & scam warning" sub="Shine has no token yet" />
        <Row icon={SI.info} href="/terms" title="Terms of service" />
        <Row icon={SI.info} href="/disputes" title="Dispute policy" sub="Reporting, review and the 70/30 rule" />
        <Row icon={SI.info} href="/privacy" title="Privacy policy" />
      </Section>

      <Section title="Account" delay={0.21}>
        <Row icon={SI.user} title="Email" sub={email || "—"} />
        <Row icon={SI.out} danger title="Log out" onClick={async () => { await logout(); router.push("/"); }} />
      </Section>
      <p className="pb-4 text-center text-xs text-white/30">Shine · v2.0 · Solana mainnet</p>
    </div>
  );
}
export default function SettingsPage() { return <SessionGate allowDeactivated text="Sign in to manage your settings."><Inner /></SessionGate>; }
