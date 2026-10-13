import type { Metadata, Viewport } from "next";
import { Montserrat, Poppins } from "next/font/google";
import "./globals.css";
import Providers from "@/components/providers";
import AppShell from "@/components/shell";
import { SITE_URL } from "@/lib/config";
import { SHUTDOWN, SHUTDOWN_MESSAGE } from "@/lib/shutdown";

const montserrat = Montserrat({ subsets: ["latin"], weight: ["500", "600", "700", "800"], variable: "--font-montserrat", display: "swap" });
const poppins = Poppins({ subsets: ["latin"], weight: ["300", "400", "500", "600", "700"], variable: "--font-poppins", display: "swap" });

const title = SHUTDOWN ? SHUTDOWN_MESSAGE : "Shine — Web3 Jobs, Paid in $SOL";
const description = SHUTDOWN ? "Due to lack of funding, Shine has permanently shut down. Beware of anyone claiming to be Shine — it is a scam." : "Discover Web3 opportunities and jobs, apply directly to projects, and get paid in SOL straight to your Shine Wallet. Powered by Solana.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SHUTDOWN ? { absolute: title } : { default: title, template: "%s · Shine" },
  robots: SHUTDOWN ? { index: false, follow: false } : undefined,
  description,
  applicationName: "Shine",
  icons: { icon: [{ url: "/favicon.ico" }, { url: "/brand/star-192.png", type: "image/png", sizes: "192x192" }], apple: "/apple-touch-icon.png" },
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    siteName: "Shine",
    title,
    description,
    url: SITE_URL,
    images: [{ url: "/og.jpg", width: 1200, height: 675, alt: "Shine — Web3 Jobs, Pay in $SOL" }],
  },
  twitter: { card: "summary_large_image", site: "@ShineSol_", title, description, images: ["/og.jpg"] },
};

export const viewport: Viewport = { themeColor: "#2b2b2e", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${montserrat.variable} ${poppins.variable}`}>
      <body className="bg-aura min-h-dvh font-sans">
        <svg width="0" height="0" aria-hidden className="absolute"><defs><linearGradient id="shine-grad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ff5e8a" /><stop offset=".5" stopColor="#ff8a5c" /><stop offset="1" stopColor="#8e44ad" /></linearGradient></defs></svg>
        <Providers>
          {SHUTDOWN ? children : <AppShell>{children}</AppShell>}
        </Providers>
      </body>
    </html>
  );
}
