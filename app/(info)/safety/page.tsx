import type { Metadata } from "next";
import { DocHeader, NoToken, Prose } from "@/components/doc";
export const metadata: Metadata = { title: "Safety & scam warning" };
export default function Page() {
  return (<>
    <DocHeader kicker="Legal" title="Safety & scam warning" sub="Stay safe while you work in Web3." />
    <NoToken />
    <Prose>
      <ul>
        <li><b>Shine staff never ask for your seed phrase, private key or PIN.</b></li>
        <li>Only trust messages in the pinned <b>Shine Support</b> chat with the verified badge.</li>
        <li>Don&apos;t start work until the project has enabled auto-payment — the chat banner tells you.</li>
        <li>Check the address before sending. Only send SOL on the Solana network.</li>
        <li>Never connect your wallet to links sent in DMs.</li>
        <li>If a project won&apos;t confirm a due payment after you&apos;ve delivered, use <b>Report project / Open dispute</b> in the chat&apos;s auto-payment panel. Keep your work in the chat and attach evidence. See the <a href="/disputes">Dispute Policy</a>.</li>
        <li>Report suspicious projects with “Report a scam” in Shine Support.</li>
      </ul>
    </Prose>
  </>);
}
