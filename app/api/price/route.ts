import { NextResponse } from "next/server";
export const revalidate = 60;
export async function GET() {
  try {
    const r = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd&include_24hr_change=true", { next: { revalidate: 60 } });
    if (r.ok) {
      const j = await r.json();
      if (j?.solana?.usd) return NextResponse.json({ usd: j.solana.usd, change24h: j.solana.usd_24h_change ?? null, source: "coingecko" });
    }
  } catch {}
  try {
    const r = await fetch("https://lite-api.jup.ag/price/v3?ids=So11111111111111111111111111111111111111112", { next: { revalidate: 60 } });
    if (r.ok) {
      const j = await r.json();
      const p = j?.So11111111111111111111111111111111111111112;
      if (p?.usdPrice) return NextResponse.json({ usd: p.usdPrice, change24h: p.priceChange24h ?? null, source: "jupiter" });
    }
  } catch {}
  return NextResponse.json({ usd: null, error: "Price unavailable" }, { status: 503 });
}
