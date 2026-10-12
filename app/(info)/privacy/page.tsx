import type { Metadata } from "next";
import { DocHeader, Prose } from "@/components/doc";
export const metadata: Metadata = { title: "Privacy policy" };
export default function Page() {
  return (<>
    <DocHeader kicker="Legal" title="Privacy policy" sub="Last updated October 2026." />
    <Prose>
      <p>This policy explains what Shine collects and why. By using Shine you agree to it.</p>
      <h2>What we collect</h2>
      <ul><li><b>Account:</b> your email (via Privy) and your Solana wallet address.</li><li><b>Profile:</b> username, avatar, bio, social handles and project details you choose to publish.</li><li><b>Activity:</b> posts, applications, replies, likes and chat messages you send.</li><li><b>Security:</b> salted hashes of your chat PIN and your authenticator secret, stored server-side only.</li></ul>
      <h2>What we don&apos;t collect</h2>
      <p>We never have access to your wallet private key. We do not sell personal data.</p>
      <h2>How we use it</h2>
      <p>To run the service: matching creators and projects, delivering messages, processing payments and escrow, preventing fraud and providing support.</p>
      <h2>Public information</h2>
      <p>Profiles, posts, replies and on-chain transactions are public. Blockchain data cannot be deleted.</p>
      <h2>Your choices</h2>
      <p>You can edit your profile at any time and request account deletion through Shine Support.</p>
      <h2>Contact</h2>
      <p>Reach us through Shine Support in the app or on X at <a href="https://x.com/ShineSol_">@ShineSol_</a>.</p>
    </Prose>
  </>);
}
