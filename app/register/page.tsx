"use client";
import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { fb } from "@/lib/firebase";
import { C } from "@/lib/config";
import { decideApplication } from "@/lib/db";
import { short, timeAgo } from "@/lib/format";
import { solscanAccount, verifySignature } from "@/lib/solana";
import type { Application, Post } from "@/lib/types";
import { SessionGate } from "@/components/gate";
import { useSession } from "@/components/providers";
import { Avatar, Button, Empty, FullLoader, PageTitle, Segmented, Sheet, StatusPill } from "@/components/ui";
import { StatusOverlay, friendlyError } from "@/components/status";
import { ICON } from "@/components/icons";
import { useToast } from "@/components/toast";
import { AnswerList } from "@/components/answer-list";
import { useFlags, VerifiedBadge } from "@/components/flags";
import { DiscordIcon, TelegramIcon, XIcon } from "@/components/icons";
import { SocialRow } from "@/components/social";

type Filter = "all" | "pending" | "approved" | "rejected";
const sortApps = (a: Application[]) => a.sort((x, y) => (y.createdAt?.toMillis?.() || 0) - (x.createdAt?.toMillis?.() || 0));

function useApps(field: "applicantUid" | "projectUid", uid: string) {
  const [apps, setApps] = useState<Application[] | null>(null);
  const toast = useToast();
  useEffect(() => {
    const { db } = fb();
    return onSnapshot(query(collection(db, C.applications), where(field, "==", uid)), (s) => setApps(sortApps(s.docs.map((d) => ({ id: d.id, ...(d.data() as any) }) as Application))),
      (e) => { toast(friendlyError(e), "err"); setApps([]); });
  }, [field, uid, toast]);
  return apps;
}

function UserRegister({ uid }: { uid: string }) {
  const apps = useApps("applicantUid", uid);
  const [filter, setFilter] = useState<Filter>("all");
  const [sel, setSel] = useState<Application | null>(null);
  if (!apps) return <FullLoader />;
  const list = apps.filter((a) => filter === "all" || a.status === filter);
  return (
    <>
      <PageTitle sub="Track every program you've registered for.">Register</PageTitle>
      <Filters value={filter} onChange={setFilter} apps={apps} />
      {!list.length ? <Empty title={apps.length ? "Nothing here" : "No applications yet"} text={apps.length ? "No applications match this filter." : "Find an opportunity in Events and apply in a few taps."} action={!apps.length && <Link href="/events"><Button>Browse Events</Button></Link>} /> : (
        <div className="space-y-2">
          {list.map((a, i) => (
            <motion.button key={a.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 10) * 0.03 }} onClick={() => setSel(a)}
              className="glass flex w-full items-center gap-3 rounded-2xl p-3 text-left hover:border-pink/40">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-pink/15 ring-1 ring-pink/30"><img src="/brand/star-64.png" alt="" className="h-5 w-5" /></div>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1 min-w-0 font-semibold"><span className="truncate">{a.projectName}</span><VerifiedBadge uid={a.projectUid} size={14} /></p>
                <p className="truncate text-xs text-white/50">{a.postExcerpt} · {timeAgo(a.createdAt)}</p>
              </div>
              <StatusPill status={a.status} />
            </motion.button>
          ))}
        </div>
      )}
      <Sheet open={!!sel} onClose={() => setSel(null)} title={sel?.projectName}>
        {sel && (
          <div className="space-y-4">
            <div className="flex items-center justify-between"><StatusPill status={sel.status} /><span className="text-xs text-white/45">Applied {timeAgo(sel.createdAt)}</span></div>
            <p className="text-sm text-white/65">{sel.postExcerpt}</p>
            <AnswerList app={sel} />
            <p className="text-xs text-white/45">Payout wallet: <span className="font-mono text-white/70">{short(sel.wallet, 6)}</span></p>
            {sel.status === "approved" ? <Link href={`/chat/${sel.id}`}><Button className="w-full">Open chat</Button></Link>
              : sel.status === "pending" ? <p className="rounded-2xl bg-amber-400/10 p-3 text-sm text-amber-100/80">The project is reviewing your application. Chat unlocks once you're approved.</p>
              : <p className="rounded-2xl bg-white/5 p-3 text-sm text-white/60">This application wasn't selected. Keep exploring new opportunities in Events.</p>}
          </div>
        )}
      </Sheet>
    </>
  );
}

function Filters({ value, onChange, apps }: { value: Filter; onChange: (f: Filter) => void; apps: Application[] }) {
  const n = (s: Filter) => (s === "all" ? apps.length : apps.filter((a) => a.status === s).length);
  return (
    <div className="no-scrollbar mb-4 flex gap-2 overflow-x-auto">
      {(["all", "pending", "approved", "rejected"] as Filter[]).map((f) => (
        <button key={f} onClick={() => onChange(f)} className={`relative shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold capitalize transition ${value === f ? "text-white" : "glass text-white/60 hover:text-white"}`}>
          {value === f && <motion.span layoutId="reg-filter" className="btn-pink absolute inset-0 rounded-full" />}
          <span className="relative">{f} <span className="opacity-60">{n(f)}</span></span>
        </button>
      ))}
    </div>
  );
}

function ProjectReview({ uid }: { uid: string }) {
  const { profile } = useSession();
  const { isVerified } = useFlags();
  const apps = useApps("projectUid", uid);
  const params = useSearchParams();
  const [posts, setPosts] = useState<Record<string, Post>>({});
  const [filter, setFilter] = useState<Filter>("pending");
  const [selId, setSelId] = useState<string | null>(params.get("app"));
  const [busy, setBusy] = useState<"approved" | "rejected" | null>(null);
  const [verified, setVerified] = useState<boolean | null>(null);
  const [status, setStatus] = useState<{ kind: "success" | "failed" | "denied"; title: string; msg?: string; chat?: string } | null>(null);
  useEffect(() => {
    const { db } = fb();
    return onSnapshot(query(collection(db, C.posts), where("authorUid", "==", uid)), (s) => {
      const m: Record<string, Post> = {}; s.docs.forEach((d) => (m[d.id] = { id: d.id, ...(d.data() as any) } as Post)); setPosts(m);
    }, () => {});
  }, [uid]);
  useEffect(() => { if (params.get("app")) setFilter("all"); }, [params]);
  const sel = useMemo(() => apps?.find((a) => a.id === selId) || null, [apps, selId]);
  useEffect(() => {
    setVerified(null);
    if (sel) verifySignature(sel.signedMessage, sel.signature, sel.wallet).then(setVerified);
  }, [sel?.id]); // eslint-disable-line
  if (!apps) return <FullLoader />;
  const list = apps.filter((a) => filter === "all" || a.status === filter);
  const decide = async (s: "approved" | "rejected") => {
    if (!sel || !profile) return;
    setBusy(s);
    try {
      await decideApplication(sel, s, profile);
      setStatus(s === "approved" ? { kind: "success", title: "Applicant approved", msg: `A private chat with @${sel.applicantUsername} is now unlocked.`, chat: sel.id } : { kind: "denied", title: "Application rejected", msg: `@${sel.applicantUsername} has been notified in their Register tab.` });
      setSelId(null);
    } catch (e) { setStatus({ kind: "failed", title: "Action failed", msg: friendlyError(e) }); }
    setBusy(null);
  };
  return (
    <>
      <PageTitle sub="Review applications to your posts and approve the best fits.">Review</PageTitle>
      <Filters value={filter} onChange={setFilter} apps={apps} />
      {!list.length ? <Empty title={apps.length ? "All caught up" : "No applications yet"} text={apps.length ? "No applications match this filter." : "Publish a post in Events to start receiving applicants."} action={!apps.length && <Link href="/events/new"><Button>Create a post</Button></Link>} /> : (
        <div className="grid gap-2.5 sm:grid-cols-2">
          {[...list].sort((x, y) => Number(isVerified(y.applicantUid)) - Number(isVerified(x.applicantUid))).map((a, i) => {
            const v = isVerified(a.applicantUid);
            const ans = a.answers as Record<string, string>;
            return (
              <motion.button key={a.id} initial={{ opacity: 0, y: 10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: Math.min(i, 10) * 0.035 }} whileHover={{ y: -2 }} onClick={() => setSelId(a.id)}
                className={`glass relative overflow-hidden rounded-3xl p-4 text-left transition hover:border-pink/40 ${v ? "!border-pink/45 shadow-[0_0_30px_-12px_rgba(255,47,166,.7)]" : ""}`}>
                {v && <span className="absolute right-0 top-0 rounded-bl-2xl bg-pink/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-pink">Verified</span>}
                <div className="flex items-center gap-3">
                  <Avatar avatar={a.applicantAvatar === "custom" ? undefined : a.applicantAvatar} size={50} ring={v} />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1 min-w-0 font-semibold"><span className="truncate">@{a.applicantUsername}</span><VerifiedBadge uid={a.applicantUid} size={14} /></p>
                    <p className="truncate text-xs text-white/45">{timeAgo(a.createdAt)} · {a.postExcerpt}</p>
                  </div>
                </div>
                {ans.pitch && <p className="mt-2.5 line-clamp-2 text-sm leading-relaxed text-white/75">“{ans.pitch}”</p>}
                <div className="mt-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-white/60">
                    {ans.x && <span className="rounded-full bg-white/[.06] p-1.5"><XIcon size={12} /></span>}
                    {ans.telegram && <span className="rounded-full bg-white/[.06] p-1.5 text-[#2aabee]"><TelegramIcon size={13} /></span>}
                    {ans.discord && <span className="rounded-full bg-white/[.06] p-1.5 text-[#8c9eff]"><DiscordIcon size={13} /></span>}
                    {ans.portfolio && <span className="rounded-full bg-pink/10 px-2 py-0.5 text-[11px] font-semibold text-pink">Portfolio</span>}
                  </div>
                  <StatusPill status={a.status} />
                </div>
              </motion.button>
            );
          })}
        </div>
      )}
      <Sheet open={!!sel} onClose={() => setSelId(null)} title="Application" full>
        {sel && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Avatar avatar={sel.applicantAvatar} size={52} />
              <div className="min-w-0 flex-1">
                <Link href={`/u/${sel.applicantUsername}`} className="font-semibold hover:underline">@{sel.applicantUsername}</Link>
                <p className="text-xs text-white/50">Applied {timeAgo(sel.createdAt)}</p>
              </div>
              <StatusPill status={sel.status} />
            </div>
            <p className="rounded-2xl bg-white/[.03] p-3 text-sm text-white/60">{sel.postExcerpt}</p>
            {(sel.answers as any).kind === "profile" ? (
              <div className="space-y-3">
                <SocialRow s={{ x: (sel.answers as any).x, telegram: (sel.answers as any).telegram, discord: (sel.answers as any).discord }} size="sm" />
                {(sel.answers as any).pitch && <div className="rounded-2xl border border-white/10 bg-white/[.03] p-3.5"><p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/45">Pitch</p><p className="whitespace-pre-wrap text-[15px] leading-relaxed text-white/85">{(sel.answers as any).pitch}</p></div>}
                {(sel.answers as any).portfolio && <a href={(sel.answers as any).portfolio} target="_blank" rel="noopener noreferrer nofollow" className="flex items-center justify-between rounded-2xl border border-pink/30 bg-pink/[.06] p-3.5 text-sm font-semibold text-pink hover:bg-pink/10"><span className="truncate">{(sel.answers as any).portfolio.replace(/^https?:\/\//, "")}</span>{ICON.external}</a>}
                {!(sel.answers as any).pitch && !(sel.answers as any).portfolio && <p className="text-sm text-white/45">Applied with their Shine profile only.</p>}
                <Link href={`/u/${sel.applicantUsername}`}><Button variant="glass" size="sm" className="w-full">View full profile</Button></Link>
              </div>
            ) : <AnswerList app={sel} post={posts[sel.postId]} />}
            <div className="rounded-2xl border border-white/10 p-3 text-sm">
              <p className="flex items-center justify-between text-white/60"><span>Payout wallet</span>
                <a href={solscanAccount(sel.wallet)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-mono text-white/85 hover:text-pink">{short(sel.wallet, 6)} {ICON.external}</a></p>
              <p className="mt-2 flex items-center justify-between text-white/60"><span>Wallet signature</span>
                <span className={verified ? "font-semibold text-emerald-300" : verified === false ? "font-semibold text-red-300" : "text-white/50"}>{verified ? "Verified ✓" : verified === false ? "Invalid" : "Signed"}</span></p>
            </div>
            {sel.status === "pending" ? (
              <div className="flex gap-2">
                <Button variant="danger" className="flex-1" loading={busy === "rejected"} disabled={!!busy} onClick={() => decide("rejected")}>Reject</Button>
                <Button className="flex-[2]" loading={busy === "approved"} disabled={!!busy} onClick={() => decide("approved")}>Approve</Button>
              </div>
            ) : sel.status === "approved" ? <Link href={`/chat/${sel.id}`}><Button className="w-full">Open chat</Button></Link> : null}
          </div>
        )}
      </Sheet>
      <StatusOverlay kind={status?.kind ?? null} title={status?.title} message={status?.msg} onClose={() => setStatus(null)}
        action={status?.chat ? <Link href={`/chat/${status.chat}`}><Button variant="glass" className="w-full">Open chat</Button></Link> : undefined} />
    </>
  );
}

function Inner() {
  const { profile, uid } = useSession();
  return profile?.role === "project" ? <ProjectReview uid={uid!} /> : <UserRegister uid={uid!} />;
}
export default function RegisterPage() {
  return <SessionGate text="Sign in to track your applications."><Suspense fallback={<FullLoader />}><Inner /></Suspense></SessionGate>;
}
