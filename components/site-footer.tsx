import Link from "next/link";
import { TELEGRAM_GROUP_URL, TG_URL, X_URL } from "@/lib/config";
import { TelegramIcon, XIcon } from "./icons";

const COLS = [
  { h: "Resources", l: [["Fees", "/fees"], ["Revenue", "/revenue"], ["Transparency", "/transparency"], ["Tech updates", "/updates"], ["About Shine", "/settings/about"]] },
  { h: "Legal", l: [["Privacy policy", "/privacy"], ["Terms of service", "/terms"], ["Dispute policy", "/disputes"], ["Safety & scam warning", "/safety"]] },
];
/** Pump.fun-style site footer: resources, legal and socials. */
export function SiteFooter() {
  return (
    <footer className="mt-12 border-t border-white/10 pb-28 pt-8 text-sm">
      <div className="grid gap-8 sm:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2"><img src="/brand/star-64.png" alt="" className="h-7 w-7" /><span className="font-display text-lg font-bold">Shine</span></div>
          <p className="mt-2 max-w-xs text-white/50">Web3 work, paid in SOL. Find opportunities, get hired and get paid on Solana.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {[{ h: X_URL, i: <XIcon size={15} />, t: "X" }, { h: TG_URL, i: <TelegramIcon size={15} />, t: "Telegram" }, { h: TELEGRAM_GROUP_URL, i: <TelegramIcon size={15} />, t: "Shine Community" }].map((s) => (
              <a key={s.h} href={s.h} target="_blank" rel="noopener noreferrer" className="glass inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-white/75 transition hover:text-pink">{s.i}{s.t}</a>
            ))}
          </div>
        </div>
        {COLS.map((c) => (
          <div key={c.h}>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/40">{c.h}</h4>
            <ul className="grid gap-2">{c.l.map(([t, h]) => <li key={h}><Link href={h} className="text-white/70 transition hover:text-pink">{t}</Link></li>)}</ul>
          </div>
        ))}
      </div>
      <p className="mt-8 rounded-2xl bg-pink/[.06] p-3 text-xs text-white/60 ring-1 ring-pink/20"><b className="text-pink">Shine has no token yet.</b> Beware of scams — any “Shine token” is not official.</p>
      <p className="mt-4 text-xs text-white/35">© {new Date().getFullYear()} Shine. All rights reserved.</p>
    </footer>
  );
}
