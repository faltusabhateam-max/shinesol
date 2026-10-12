import type { Metadata } from "next";
import { DocHeader, NoToken } from "@/components/doc";
import { RevenueDashboard } from "./dashboard";
export const metadata: Metadata = { title: "Revenue & proof", description: "Live, on-chain proof of every fee Shine collects and every SOL paid to creators." };
export default function Revenue() {
  return (
    <>
      <DocHeader kicker="Resources" title="Revenue & proof" sub="Live numbers straight from our public ledger. Every row is a Solana transaction verified by Shine's server — click through to Solscan to check it yourself." />
      <NoToken />
      <RevenueDashboard />
    </>
  );
}
