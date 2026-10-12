"use client";
import { SiteFooter } from "@/components/site-footer";
import { motion } from "framer-motion";
import Link from "next/link";
import { IconTile, LIcon } from "@/components/line-icons";
import { TELEGRAM_GROUP_URL, TG_URL, X_URL } from "@/lib/config";
import { BackLink } from "@/components/ui";
import { TelegramIcon, XIcon } from "@/components/icons";

const STEPS: { t: string; d: string; icon: any }[] = [
  { t: "On-Chain Payment Protection", icon: "shield", d: "Once a creator is hired, the project must deposit the agreed payment into the Shine Vault before work begins. Whether it's $50 per week or $100 per month, the funds are secured upfront." },
  { t: "Creators Get Paid for Their Work", icon: "signature", d: "When the agreed period ends, the project signs a wallet confirmation message to release the payment directly to the creator's Shine Wallet." },
  { t: "Protection Against Unfair Non-Payment", icon: "handshake", d: "If a project refuses to confirm payment after the creator completes the agreed work, the creator can report the project. Shine can hold the funds while the case is reviewed." },
  { t: "Fair Dispute Resolution", icon: "scale", d: "Shine reviews the relevant chat records and work evidence to determine whether the creator fulfilled their obligations. If the project fails to confirm payment despite satisfactory work, the dispute policy may allocate 70% of the funds to the creator and 30% to the Shine Vault." },
  { t: "Transparent Fees and Policies", icon: "receipt", d: "Withdrawal fees, platform policies, and other important details are available on the Shine website, so users can understand the rules before participating." },
];

export default function About() {
  return (
    <div className="-mx-4 -mt-4">
      <div className="absolute left-4 top-20 z-10"><BackLink href="/settings" label="Settings" /></div>
      <section className="relative">
        <div className="relative aspect-video w-full overflow-hidden sm:rounded-b-[2rem]">
          <video className="h-full w-full object-cover" autoPlay muted loop playsInline preload="auto" poster="/media/how-it-works-poster.jpg" aria-label="How Shine works">
            <source src="/media/how-it-works.webm" type="video/webm" />
            <source src="/media/how-it-works.mp4" type="video/mp4" />
          </video>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-b from-transparent via-[#050307]/70 to-[#050307]" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 backdrop-blur-[3px] [mask-image:linear-gradient(to_bottom,transparent,black)]" />
        </div>
        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.6 }}
          className="relative -mt-12 px-5 font-display text-5xl font-semibold tracking-tight text-glow sm:-mt-16 sm:text-6xl">
          About Shine
        </motion.h1>
      </section>

      <div className="px-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="mt-5 flex flex-wrap gap-3">
          <a href={X_URL} target="_blank" rel="noopener noreferrer" className="glass group inline-flex items-center gap-2.5 rounded-2xl px-4 py-2.5 font-semibold transition hover:border-pink/50">
            <motion.span whileHover={{ rotate: -12, scale: 1.15 }}><XIcon size={18} /></motion.span> @ShineSol_
          </a>
          <a href={TG_URL} target="_blank" rel="noopener noreferrer" className="glass group inline-flex items-center gap-2.5 rounded-2xl px-4 py-2.5 font-semibold transition hover:border-pink/50">
            <motion.span whileHover={{ rotate: 12, scale: 1.15 }} className="text-[#2aabee]"><TelegramIcon size={19} /></motion.span> Shine Channel
          </a>
          <a href={TELEGRAM_GROUP_URL} target="_blank" rel="noopener noreferrer" className="glass group inline-flex items-center gap-2.5 rounded-2xl px-4 py-2.5 font-semibold transition hover:border-pink/50">
            <motion.span whileHover={{ rotate: 12, scale: 1.15 }} className="text-[#2aabee]"><TelegramIcon size={19} /></motion.span> Shine Community
          </a>
        </motion.div>

        <section className="mt-10">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-pink">Introducing Shine</p>
          <h2 className="mt-2 font-display text-2xl font-semibold leading-tight sm:text-3xl">Where Creators and Projects Connect, On-Chain.</h2>
          <p className="mt-3 text-white/65">Shine is a platform built to connect talented creators with projects while making payments more transparent, secure, and accountable.</p>
          <p className="mt-2 font-semibold text-white/85">Everything runs on Solana. Everything is on-chain.</p>
          <h3 className="mt-8 font-display text-lg font-semibold">Here&apos;s how Shine works</h3>
          <ol className="mt-4 grid gap-3">
            {STEPS.map((p, i) => (
              <motion.li key={p.t} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-40px" }} transition={{ delay: i * 0.06 }}
                className="glass flex gap-4 rounded-3xl p-5">
                <div className="relative shrink-0"><IconTile name={p.icon} />
                  <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-pink text-[11px] font-bold text-black">{i + 1}</span></div>
                <div className="min-w-0"><h4 className="font-display font-semibold">{i + 1}. {p.t}</h4>
                  <p className="mt-1 text-sm leading-relaxed text-white/60">{p.d}</p></div>
              </motion.li>
            ))}
          </ol>
          <div className="glass mt-8 rounded-3xl border-pink/30 p-6">
            <div className="flex items-center gap-3"><IconTile name="spark" /><h3 className="font-display text-xl font-semibold">Why Shine?</h3></div>
            <p className="mt-3 text-white/75">Projects deserve quality work. Creators deserve fair payment.</p>
            <p className="mt-2 text-sm leading-relaxed text-white/60">Shine is designed to protect both sides through on-chain payment handling, transparent rules, and a structured dispute process.</p>
            <ul className="mt-3 space-y-1.5 text-sm text-white/70">
              <li className="flex items-center gap-2"><LIcon name="x" size={14} animate={false} /> No relying on empty promises.</li>
              <li className="flex items-center gap-2"><LIcon name="x" size={14} animate={false} /> No guessing whether payment will arrive.</li>
              <li className="flex items-center gap-2 text-pink-soft"><LIcon name="check" size={14} /> Just a clearer way for creators and projects to work together.</li>
            </ul>
            <p className="mt-4 text-sm text-white/60">Shine is building a better creator economy on Solana.</p>
          </div>
          <p className="mt-8 text-center font-display text-xl font-semibold text-glow">Connect. Collaborate. Get paid.</p>
          <p className="mt-1 text-center text-white/60">All powered by Shine.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3 text-sm">
            <Link href="/fees" className="text-pink hover:underline">Fees</Link><Link href="/terms" className="text-pink hover:underline">Terms</Link>
            <Link href="/disputes" className="text-pink hover:underline">Dispute Policy</Link><Link href="/safety" className="text-pink hover:underline">Safety</Link></div>
          <p className="mt-8 text-center text-xs text-white/35">© {new Date().getFullYear()} Shine · Built on Solana</p>
        </section>
        <div className="h-28 sm:h-10" aria-hidden />
      </div>
      <SiteFooter />
    </div>
  );
}
