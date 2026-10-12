import type { Metadata } from "next";
import { DocHeader } from "@/components/doc";
export const metadata: Metadata = { title: "Tech updates" };
const U = [
  ["Oct 2026", "Public revenue dashboard & ledger", "Every fee, escrow, verification and affiliate transaction is now verified on-chain and published live."],
  ["Oct 2026", "Affiliate badges", "Verified projects can grant their badge to up to 20 community members."],
  ["Oct 2026", "Escrow auto-payments", "Projects pre-fund weekly or monthly payments into the Shine vault; creators get paid on confirmation."],
  ["Oct 2026", "Chat PIN & authenticator", "Lock your chats with a 4-digit PIN, recoverable with Google Authenticator."],
  ["Oct 2026", "Shine Verified", "Paid verification with boosted visibility and direct messages to projects."],
  ["Sep 2026", "One-tap apply", "Apply with your Shine profile, socials and wallet in one tap."],
];
export default function Page() {
  return (<>
    <DocHeader kicker="Resources" title="Tech updates" sub="What we've shipped recently." />
    <ol className="relative space-y-4 border-l border-pink/30 pl-6">{U.map(([d, t, s]) => (
      <li key={t} className="relative"><span className="absolute -left-[31px] top-1.5 h-3 w-3 rounded-full bg-pink shadow-[0_0_12px_#ff2fa6]" />
        <p className="text-xs text-white/40">{d}</p><h3 className="font-semibold">{t}</h3><p className="text-sm text-white/60">{s}</p></li>
    ))}</ol>
  </>);
}
