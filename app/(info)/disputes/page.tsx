import type { Metadata } from "next";
import Link from "next/link";
import { DocHeader, Prose } from "@/components/doc";
export const metadata: Metadata = { title: "Dispute policy", description: "How Shine protects creators and projects when a payment is disputed." };
export default function Page() {
  return (<>
    <DocHeader kicker="Legal" title="Dispute policy" sub="Last updated October 2026." />
    <Prose>
      <p>Shine protects both sides of every engagement. Projects deserve quality work and creators deserve fair payment. This policy explains what happens when a project and a creator disagree about a payment.</p>
      <h2>1. Funds are secured before work begins</h2>
      <p>Once a creator is hired, the project deposits the agreed payment for each period into the Shine Vault before work begins. Those funds stay in the vault until they are released, refunded or allocated under this policy.</p>
      <h2>2. Normal release</h2>
      <p>When the agreed period ends, the project signs a wallet confirmation message and the payment is released directly to the creator&apos;s Shine Wallet, minus the project payment fee listed on the <Link href="/fees">Fees</Link> page.</p>
      <h2>3. Reporting a project</h2>
      <ul>
        <li>If a period is due and the project has not confirmed payment, the creator can choose <b>Report project / Open dispute</b> from the chat&apos;s auto-payment panel.</li>
        <li>The creator describes what was agreed and delivered, and can attach links and screenshots as work evidence.</li>
        <li>While the case is open, the funds are held in the Shine Vault and cannot be released or refunded by either party.</li>
      </ul>
      <h2>4. Review</h2>
      <ul>
        <li>Opening a dispute gives consent for the Shine team to review the chat records of that engagement and the submitted evidence. Every access is recorded in our internal audit log.</li>
        <li>The project may respond in the chat with its own evidence.</li>
        <li>Shine decides whether the creator fulfilled their obligations based on what was agreed in the post, the apply steps and the chat.</li>
      </ul>
      <h2>5. Possible outcomes</h2>
      <ul>
        <li><b>Project failed to confirm despite satisfactory work:</b> 70% of the held funds go to the creator and 30% go to the Shine Vault.</li>
        <li><b>Work delivered, delay in good faith:</b> 100% is released to the creator (less the standard project payment fee).</li>
        <li><b>Work not delivered as agreed:</b> the funds are refunded to the project.</li>
      </ul>
      <p>Every resolution is an on-chain Solana transaction from the Shine Vault. It is recorded on the public <Link href="/revenue">ledger</Link> as “Dispute resolution”.</p>
      <h2>6. Good conduct</h2>
      <p>Opening false or abusive disputes, or refusing to confirm payment for completed work, may lead to account restrictions under our <Link href="/terms">Terms of service</Link>.</p>
      <h2>7. Final decisions</h2>
      <p>Shine aims to resolve cases fairly and quickly. Because blockchain transactions are irreversible, a resolution that has been executed cannot be reversed.</p>
    </Prose>
  </>);
}
