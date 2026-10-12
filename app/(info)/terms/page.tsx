import type { Metadata } from "next";
import Link from "next/link";
import { DocHeader, Prose } from "@/components/doc";
export const metadata: Metadata = { title: "Terms of service" };
export default function Page() {
  return (<>
    <DocHeader kicker="Legal" title="Terms of service" sub="Last updated October 2026." />
    <Prose>
      <p>These terms govern your use of Shine. If you don&apos;t agree, please don&apos;t use the service.</p>
      <h2>The service</h2>
      <p>Shine connects creators with Web3 projects and lets them communicate and transact in SOL on Solana. Shine is not a party to agreements between creators and projects.</p>
      <h2>Your account</h2>
      <ul><li>You must provide accurate information and keep your login secure.</li><li>You are responsible for transactions you sign. Blockchain transactions are irreversible.</li><li>We may deactivate accounts that break these terms, impersonate others or attempt scams.</li></ul>
      <h2>Payment protection</h2>
      <ul>
        <li>Once a creator is hired, the project must deposit the agreed payment into the Shine Vault before work begins. Funds for each agreed period (for example $50 per week or $100 per month) are secured upfront.</li>
        <li>When the agreed period ends, the project releases the payment by signing a wallet confirmation message. Funds go directly to the creator&apos;s Shine Wallet.</li>
        <li>Projects must not withhold confirmation for work that was completed as agreed.</li>
      </ul>
      <h2>Reporting and disputes</h2>
      <ul>
        <li>If a project refuses to confirm payment after the creator completes the agreed work, the creator can report the project and open a dispute. Shine may hold the funds in the Shine Vault while the case is reviewed.</li>
        <li>By opening or responding to a dispute, both parties agree that Shine may review the relevant chat records and the work evidence submitted for that case.</li>
        <li>If Shine finds the creator fulfilled their obligations and the project failed to confirm payment despite satisfactory work, the dispute policy may allocate <strong>70% of the held funds to the creator and 30% to the Shine Vault</strong>.</li>
        <li>If the creator did the work and the project acted in good faith, Shine may release 100% to the creator. If the creator did not deliver, Shine may refund the project.</li>
        <li>Full details are in the <Link href="/disputes">Dispute Policy</Link>. Dispute outcomes are recorded on the public <Link href="/revenue">ledger</Link>.</li>
      </ul>
      <h2>Refunds</h2>
      <p>Funds for a period that has not started, or that ends without the creator delivering the agreed work, can be refunded to the project, either by mutual agreement or by Shine&apos;s dispute decision. Refunds are paid from the Shine Vault to the project&apos;s wallet, minus Solana network fees. Verified plans are non-refundable once active.</p>
      <h2>Fees</h2>
      <p>All fees, including withdrawal fees, are listed on the <Link href="/fees">Fees</Link> page before you participate.</p>
      <h2>Content</h2>
      <p>You keep ownership of what you post but grant Shine a licence to display it. Don&apos;t post illegal, misleading or abusive content.</p>
      <h2>No token, no investment advice</h2>
      <p>Shine has no token. Nothing on Shine is investment advice.</p>
      <h2>Liability</h2>
      <p>Shine is provided “as is”. To the extent permitted by law, Shine is not liable for losses from user agreements, network failures, price movements or wallet misuse.</p>
      <h2>Changes</h2>
      <p>We may update these terms and will note the date above.</p>
    </Prose>
  </>);
}
