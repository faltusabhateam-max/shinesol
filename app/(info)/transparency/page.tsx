import type { Metadata } from "next";
import Link from "next/link";
import { DocHeader, NoToken, Prose } from "@/components/doc";
import { FEE_WALLET } from "@/lib/config";
export const metadata: Metadata = { title: "Transparency" };
export default function Page() {
  return (<>
    <DocHeader kicker="Resources" title="Transparency" sub="How Shine handles your money, and how you can verify it." />
    <NoToken />
    <Prose>
      <h2>Your wallet is yours</h2>
      <p>Every Shine account gets a self-custodial Solana wallet created by Privy. Shine never sees your private key. Every transaction from your wallet is shown in a Shine confirmation sheet before you sign.</p>
      <h2>The Shine vault</h2>
      <p>Escrowed auto-payments and all Shine fees are held in a single public address: <a href={`https://solscan.io/account/${FEE_WALLET}`}>{FEE_WALLET}</a>. Anyone can see its balance and history on Solscan.</p>
      <h2>Escrow</h2>
      <ul><li>Projects fund one period at a time. Our server verifies the funding transaction (amount and destination) on-chain before marking it funded.</li><li>Releases require a wallet signature from the project, are idempotent, and are posted in the chat with a Solscan link.</li><li>Refunds and disputes are reviewed by the Shine team. To review a chat, the project must grant 5-minute access, which is logged.</li></ul>
      <h2>Public ledger</h2>
      <p>Every fee, escrow, verification and affiliate transaction is written to a public ledger by our server after on-chain confirmation. See it live on the <Link href="/revenue">Revenue</Link> page, or read the open API at <a href="/api/public/ledger">/api/public/ledger</a>.</p>
      <h2>Fees</h2>
      <p>The full fee table is on the <Link href="/fees">Fees</Link> page.</p>
    </Prose>
  </>);
}
