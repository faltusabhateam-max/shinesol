import type { Metadata } from "next";
import Link from "next/link";
import { DocHeader, NoToken } from "@/components/doc";
import { AFFILIATE_USD, FEE_BPS, FEE_WALLET, PROJECT_FEE_BPS, VERIFY_PLANS } from "@/lib/config";
export const metadata: Metadata = { title: "Fees", description: "Every fee on Shine, in one table." };

const ROWS: [string, string, string][] = [
  ["Create account, Shine Wallet, profile", "Free", "—"],
  ["Browse, apply, chat, like and reply", "Free", "—"],
  ["Deposit SOL to your Shine Wallet", "Solana network fee only", "Paid by sender"],
  ["Project payment to creator (escrow release)", `${PROJECT_FEE_BPS / 100}%`, "Deducted from the released amount"],
  ["Project payment to creator (direct chat payment)", `${PROJECT_FEE_BPS / 100}%`, "Added on top, same transaction"],
  ["Escrow funding / refund", "Network fee only", "—"],
  ["Dispute resolution (project fails to confirm despite satisfactory work)", "70% creator / 30% Shine Vault", "Of the held escrow amount, per the Dispute Policy"],
  ["Withdraw / send from Shine Wallet", `${FEE_BPS / 100}%`, "Added on top, same transaction"],
  ...VERIFY_PLANS.map((p) => [`Shine Verified — ${p.label}`, `$${p.usd}`, "Paid in SOL at live price"] as [string, string, string]),
  ["Affiliate distribution (Verified projects)", `$${AFFILIATE_USD}`, "One-time, paid in SOL"],
];

export default function Fees() {
  return (
    <>
      <DocHeader kicker="Resources" title="Fees" sub="Shine is free to use. We only take a small cut when money moves — and every fee is on-chain and public." />
      <NoToken />
      <div className="glass overflow-hidden rounded-3xl">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/[.04] text-xs uppercase tracking-wider text-white/45"><tr><th className="px-4 py-3 font-medium">Action</th><th className="px-4 py-3 font-medium">Fee</th><th className="hidden px-4 py-3 font-medium sm:table-cell">Notes</th></tr></thead>
          <tbody>{ROWS.map(([a, f, n]) => (
            <tr key={a} className="border-t border-white/5"><td className="px-4 py-3.5 text-white/85">{a}<div className="text-xs text-white/40 sm:hidden">{n}</div></td><td className="px-4 py-3.5 font-semibold text-pink">{f}</td><td className="hidden px-4 py-3.5 text-white/50 sm:table-cell">{n}</td></tr>
          ))}</tbody>
        </table>
      </div>
      <div className="mt-6 grid gap-3 text-sm text-white/60 sm:grid-cols-2">
        <p className="glass rounded-2xl p-4">All Shine fees go to the Shine vault <a className="break-all font-mono text-pink underline" href={`https://solscan.io/account/${FEE_WALLET}`} target="_blank" rel="noopener noreferrer">{FEE_WALLET}</a>.</p>
        <p className="glass rounded-2xl p-4 sm:col-span-2">Disputes: if a project refuses to confirm payment after satisfactory work, the held funds may be split 70% to the creator and 30% to the Shine Vault. Read the <Link href="/disputes" className="text-pink underline">Dispute Policy</Link>.</p>
        <p className="glass rounded-2xl p-4">Every fee is recorded in our public ledger. See totals and every transaction on the <Link href="/revenue" className="text-pink underline">Revenue</Link> dashboard.</p>
      </div>
    </>
  );
}
