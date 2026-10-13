"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useSession } from "@/components/providers";
import { SignInGate } from "@/components/gate";
import { Button, Card, ProgressRing } from "@/components/ui";
import { useToast } from "@/components/toast";
import { ShareSheet } from "@/components/share-sheet";
import { useApi } from "@/lib/client-api";
import { usePrice } from "@/lib/use-price";
import { fmtSol, fmtUsd, timeAgo } from "@/lib/format";
import { REF_ACTIVE_DAYS, REF_TIERS, REF_WINDOW_DAYS, SITE_URL, type RefStatus } from "@/lib/config";
import { CheckBadgeIcon, CoinIcon, CopyIcon, GiftIcon, LinkIcon, PulseIcon, StatusBadge, ShareIcon, ShieldAlertIcon, UsersIcon } from "@/components/referral";

type Tier = (typeof REF_TIERS)[number] & { status: RefStatus; claim: null | { status: RefStatus; reason: string | null; lamports: number; price: number | null; tx: string | null; funded: boolean } };
type Data = { username: string; total: number; qualified: number; tiers: Tier[]; referredBy: string | null; referrals: { username: string; attachedAt: string; verified: boolean; active: boolean; activeDays: number; qualified: boolean }[] };

const STEPS = [
  { Icon: LinkIcon, t: "Share your link", d: "Your referral code is your Shine username. Share your link anywhere." },
  { Icon: UsersIcon, t: "Friends join Shine", d: "They sign up through your link. The referral is locked to you permanently." },
  { Icon: CheckBadgeIcon, t: "They get verified", d: "A referral qualifies once our team verifies the account." },
  { Icon: PulseIcon, t: "They stay active", d: `Qualified users are active on at least ${REF_ACTIVE_DAYS} of the last ${REF_WINDOW_DAYS} days.` },
  { Icon: GiftIcon, t: "Claim your rewards", d: "Hit a milestone, request your reward and get paid in SOL after team review." },
];
const RULES = [
  "Fake, bot, duplicate or self referrals are disqualified.",
  "Only referrals verified by the Shine team count toward milestones.",
  `Inactive users don't count — referrals must be active on ${REF_ACTIVE_DAYS}+ of the last ${REF_WINDOW_DAYS} days.`,
  "Dollar rewards are paid in SOL at the SOL price on the payout day.",
  "Every claim is reviewed by the team and may take time to process.",
  "Each milestone reward can be claimed once per account.",
  "Abuse of the program leads to disqualification and a permanent ban.",
  "Shine may update or end the program at any time.",
];

export default function ReferralPage() {
  const { ready, authenticated, profile, profileLoaded } = useSession();
  const api = useApi();
  const toast = useToast();
  const { usd } = usePrice();
  const [d, setD] = useState<Data | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [share, setShare] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const load = useCallback(() => api<Data>("/api/referral", { action: "status" }).then((x) => { setD(x); setErr(null); }).catch((e) => setErr(e.message)), [api]);
  useEffect(() => { if (authenticated && profile) load(); }, [authenticated, profile, load]);

  const username = d?.username || profile?.username || "";
  const link = `${SITE_URL}/?ref=${username}`;
  const short = `${SITE_URL}/r/${username}`;
  const copy = async (v: string, k: string) => { try { await navigator.clipboard.writeText(v); setCopied(k); toast("Copied", "ok"); setTimeout(() => setCopied(null), 1600); } catch { toast("Copy failed", "err"); } };
  const doShare = async () => {
    if (navigator.share) { try { await navigator.share({ title: "Join me on Shine", text: "Web3 jobs paid in SOL — join me on Shine", url: short }); return; } catch {} }
    setShare(true);
  };
  const act = async (action: "request" | "claim", tier: string) => {
    setBusy(tier);
    try {
      const r = await api<{ tx?: string }>("/api/referral", { action, tier });
      toast(action === "request" ? "Request sent to the team" : "Reward sent to your Shine wallet", "ok");
      await load();
      if (r.tx) window.open(`https://solscan.io/tx/${r.tx}`, "_blank", "noopener");
    } catch (e: any) { toast(e.message, "err"); } finally { setBusy(null); }
  };

  const qualified = d?.qualified ?? 0;
  const next = REF_TIERS.find((t) => qualified < t.at);
  const max = REF_TIERS[REF_TIERS.length - 1].at;
  const pct = Math.min(100, (qualified / max) * 100);

  return (
    <div className="space-y-5">
      {/* Hero */}
      <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass-strong relative overflow-hidden rounded-3xl p-5 sm:p-7">
        <div className="relative flex items-start gap-3">
          <motion.div className="icon-grad neu-sm grid h-12 w-12 shrink-0 place-items-center rounded-[16px] text-pink"><GiftIcon size={26} /></motion.div>
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">Referral program</h1>
            <p className="mt-1 text-sm text-white/60">Invite friends to Shine. Unlock a permanent Verified badge and up to <span className="text-pink">$900 in SOL</span>.</p>
          </div>
        </div>
      </motion.section>

      {!ready || (authenticated && !profileLoaded) ? <div className="skeleton h-40 rounded-3xl" /> : !authenticated || !profile ? (
        <SignInGate text="Sign in and create your Shine profile to get your referral link." />
      ) : (
        <>
          {/* Link card */}
          <Card className="p-4 sm:p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">Your referral code</p>
            <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
              <p className="min-w-0 truncate font-display text-2xl font-bold grad-text">@{username}</p>
              {d?.referredBy && <span className="text-xs text-white/45">Referred by @{d.referredBy}</span>}
            </div>
            {[{ k: "link", v: link }, { k: "short", v: short }].map(({ k, v }) => (
              <div key={k} className="mt-3 flex items-center gap-2 rounded-2xl bg-[#2a2a2d] shadow-[var(--inset)] p-1.5 pl-3">
                <span className="min-w-0 flex-1 truncate text-[13px] text-white/75">{v.replace(/^https:\/\//, "")}</span>
                <motion.button whileTap={{ scale: 0.9 }} type="button" onClick={() => copy(v, k)} aria-label="Copy link" className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/5 text-white/80 hover:bg-pink/20 hover:text-pink">
                  <AnimatePresence mode="wait" initial={false}>
                    {copied === k ? <motion.svg key="ok" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><motion.path d="M5 12.5l4.5 4.5L19 7.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} /></motion.svg>
                      : <motion.span key="c" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}><CopyIcon /></motion.span>}
                  </AnimatePresence>
                </motion.button>
              </div>
            ))}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button variant="glass" className="whitespace-nowrap px-2" onClick={() => copy(short, "short")}><CopyIcon /> Copy link</Button>
              <Button className="whitespace-nowrap px-2" onClick={doShare}><ShareIcon /> Share</Button>
            </div>
          </Card>

          {/* Stats + progress */}
          <Card className="p-4 sm:p-5">
            {err && <p className="mb-3 rounded-xl bg-red-500/10 p-3 text-sm text-red-300">{err}</p>}
            <div className="flex flex-col items-center gap-5 min-[420px]:flex-row">
            <ProgressRing pct={pct}><p className="font-display text-3xl font-bold leading-none">{qualified}</p><p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-white/50">of {max}</p></ProgressRing>
            <div className="grid w-full flex-1 grid-cols-2 gap-3">
              {[{ l: "Total referrals", v: d?.total, I: UsersIcon }, { l: "Qualified", v: d?.qualified, I: CheckBadgeIcon }].map(({ l, v, I }, i) => (
                <motion.div key={l} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className="neu-inset rounded-[18px] p-3.5">
                  <div className={`flex items-center gap-1.5 text-xs ${i ? "icon-grad text-pink" : "text-white/55"}`}><I size={15} />{l}</div>
                  <p className="mt-1 font-display text-3xl font-bold">{v ?? <span className="skeleton inline-block h-7 w-10 rounded" />}</p>
                </motion.div>
              ))}
            </div>
            </div>
            <div className="mt-6">
              <div className="mb-2 flex items-center justify-between text-xs text-white/55">
                <span>{next ? <>Next: <span className="text-white">{next.label}</span> at {next.at}</> : <span className="text-emerald-300">All milestones reached</span>}</span>
                <span>{qualified}/{max}</span>
              </div>
              <div className="relative h-3 rounded-full neu-inset">
                <motion.div className="absolute inset-y-0 left-0 overflow-hidden rounded-full grad" initial={{ width: 0 }} animate={{ width: `${Math.max(pct, qualified ? 1.5 : 0)}%` }} transition={{ duration: 1.2, ease: "easeOut" }}>
                  
                </motion.div>
                {REF_TIERS.map((t) => (
                  <span key={t.id} className={`absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 ${qualified >= t.at ? "border-[#ff8a5c] bg-[#ff8a5c]" : "border-white/25 bg-[#2a2a2d]"}`} style={{ left: `${(t.at / max) * 100}%` }} />
                ))}
              </div>
              <div className="relative mt-2 h-4 text-[10px] text-white/45">
                {REF_TIERS.map((t, i) => <span key={t.id} className={`absolute ${i === REF_TIERS.length - 1 ? "-translate-x-full" : "-translate-x-1/2"}`} style={{ left: `${(t.at / max) * 100}%` }}>{t.at}</span>)}
              </div>
            </div>
          </Card>

          {/* Tiers */}
          <section>
            <h2 className="mb-3 font-display text-lg font-bold">Milestones</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {(d?.tiers || REF_TIERS.map((t) => ({ ...t, status: "locked" as RefStatus, claim: null }))).map((t, i) => {
                const badge = t.kind === "badge";
                const sol = t.claim?.lamports ? t.claim.lamports / 1e9 : usd ? t.usd / usd : null;
                const prog = Math.min(100, (qualified / t.at) * 100);
                return (
                  <motion.div key={t.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i }} whileHover={{ y: -2 }}
                    className={`glass relative overflow-hidden rounded-3xl p-4 ${t.status === "approved" ? "ring-1 ring-pink/60 shadow-[var(--raise-sm)]" : ""}`}>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="flex min-w-0 flex-1 items-center gap-2.5">
                        <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl ring-1 ${t.status === "locked" ? "bg-white/5 text-white/45 ring-white/10" : "icon-grad neu-sm text-pink ring-pink/40"}`}>{badge ? <CheckBadgeIcon /> : <CoinIcon />}</div>
                        <div className="min-w-0">
                          <p className="font-semibold">{badge ? "Permanent Verified" : fmtUsd(t.usd)}</p>
                          <p className="text-xs text-white/50">{t.at} qualified referrals</p>
                        </div>
                      </div>
                      <StatusBadge s={t.status} badge={badge} />
                    </div>
                    {!badge && <p className="mt-2 text-xs text-white/50">{t.claim?.lamports ? <>Payout: <span className="text-white">{fmtSol(sol!, 4)} SOL</span> (at {fmtUsd(t.claim.price || 0)}/SOL)</> : sol ? <>≈ {fmtSol(sol, 3)} SOL at today&apos;s price ({fmtUsd(usd!)}/SOL)</> : "Paid in SOL"}</p>}
                    {badge && <p className="mt-2 text-xs text-white/50">A Verified badge that never expires.</p>}
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[.06]"><motion.div className="h-full rounded-full bg-pink" initial={{ width: 0 }} animate={{ width: `${prog}%` }} transition={{ duration: 1 }} /></div>
                    {t.status === "rejected" && t.claim?.reason && <p className="mt-2 rounded-xl bg-red-500/10 p-2 text-xs text-red-300">Reason: {t.claim.reason}</p>}
                    <div className="mt-3">
                      {t.status === "paid" ? (badge ? <Button variant="glass" className="w-full" disabled>Badge granted</Button>
                        : <a href={`https://solscan.io/tx/${t.claim?.tx}`} target="_blank" rel="noopener noreferrer"><Button variant="glass" className="w-full">View payout on Solscan</Button></a>)
                        : t.status === "approved" ? <Button className="w-full" loading={busy === t.id} onClick={() => act("claim", t.id)}>Claim {sol ? `${fmtSol(sol, 4)} SOL` : "reward"}</Button>
                        : t.status === "eligible" || t.status === "rejected" ? <Button className="w-full" loading={busy === t.id} onClick={() => act("request", t.id)}>{t.status === "rejected" ? "Request again" : "Claim"}</Button>
                        : <Button variant="glass" className="w-full" disabled>{t.status === "locked" ? `${Math.max(0, t.at - qualified)} more to unlock` : t.status === "requested" ? "Request sent" : "Under team review"}</Button>}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </section>

          {/* Referrals list */}
          <Card className="p-4 sm:p-5">
            <h2 className="mb-3 font-display text-lg font-bold">Your referrals</h2>
            {!d ? <div className="skeleton h-16 rounded-2xl" /> : !d.referrals.length ? <p className="text-sm text-white/50">No referrals yet. Share your link to get started.</p> : (
              <ul className="divide-y divide-white/5">{d.referrals.map((r) => (
                <li key={r.username + r.attachedAt} className="flex items-center justify-between gap-2 py-2.5">
                  <div className="min-w-0"><Link href={`/u/${r.username}`} className="truncate text-sm font-semibold hover:text-pink">@{r.username}</Link><p className="text-[11px] text-white/45">{timeAgo(r.attachedAt ? new Date(r.attachedAt) : null)} · active {r.activeDays}/{REF_WINDOW_DAYS} days</p></div>
                  <div className="flex shrink-0 flex-wrap justify-end gap-1">
                    {r.qualified ? <span className="rounded-full bg-emerald-400/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">Qualified</span> : <>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${r.verified ? "bg-sky-400/10 text-sky-300" : "bg-white/5 text-white/45"}`}>{r.verified ? "Verified" : "Not verified"}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${r.active ? "bg-sky-400/10 text-sky-300" : "bg-white/5 text-white/45"}`}>{r.active ? "Active" : "Inactive"}</span></>}
                  </div>
                </li>
              ))}</ul>
            )}
          </Card>
        </>
      )}

      {/* How it works */}
      <section>
        <h2 className="mb-3 font-display text-lg font-bold">How it works</h2>
        <ol className="grid gap-2.5">{STEPS.map(({ Icon, t, d: desc }, i) => (
          <motion.li key={t} initial={{ opacity: 0, x: -12 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06 }} className="glass flex items-start gap-3 rounded-2xl p-3.5">
            <div className="relative grid h-10 w-10 shrink-0 place-items-center rounded-xl icon-grad neu-sm text-pink"><Icon /><span className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-pink text-[10px] font-bold text-white">{i + 1}</span></div>
            <div className="min-w-0"><p className="font-semibold">{t}</p><p className="text-sm text-white/55">{desc}</p></div>
          </motion.li>
        ))}</ol>
      </section>

      {/* Rules & alerts */}
      <section className="glass relative overflow-hidden rounded-3xl border border-amber-400/20 p-4 sm:p-5">
        <div className="mb-3 flex items-center gap-2 text-amber-300"><ShieldAlertIcon size={22} /><h2 className="font-display text-lg font-bold text-white">Rules &amp; Alerts</h2></div>
        <ul className="grid gap-2">{RULES.map((r, i) => (
          <motion.li key={r} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.04 }} className="flex gap-2.5 text-sm text-white/70">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-300 shadow-[0_0_8px_rgba(252,211,77,.8)]" />{r}
          </motion.li>
        ))}</ul>
      </section>

      <ShareSheet open={share} onClose={() => setShare(false)} url={short} title="Web3 jobs paid in SOL — join me on Shine" />
    </div>
  );
}
