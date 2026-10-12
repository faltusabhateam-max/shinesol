import type { Metadata, Viewport } from "next";
import { Inter, Poppins } from "next/font/google";
import "./globals.css";
import Providers from "@/components/providers";
import AppShell from "@/components/shell";
import { SITE_URL } from "@/lib/config";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const poppins = Poppins({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-poppins", display: "swap" });

const title = "Shine — Web3 Jobs, Paid in $SOL";
const description = "Discover Web3 opportunities and jobs, apply directly to projects, and get paid in SOL straight to your Shine Wallet. Powered by Solana.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: title, template: "%s · Shine" },
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

export const viewport: Viewport = { themeColor: "#050307", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${poppins.variable}`}>
      <body className="bg-aura min-h-dvh font-sans">
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
