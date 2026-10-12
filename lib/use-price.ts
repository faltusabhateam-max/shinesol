"use client";
import { useEffect, useState } from "react";
let cache: { usd: number | null; change: number | null; at: number } | null = null;
export function usePrice() {
  const [p, setP] = useState<{ usd: number | null; change: number | null }>(cache || { usd: null, change: null });
  useEffect(() => {
    let alive = true;
    const load = async () => {
      if (cache && Date.now() - cache.at < 60_000) { setP(cache); return; }
      try {
        const r = await fetch("/api/price");
        const j = await r.json();
        if (j.usd) { cache = { usd: j.usd, change: j.change24h ?? null, at: Date.now() }; if (alive) setP(cache); }
      } catch {}
    };
    load();
    const t = setInterval(load, 60_000);
    return () => { alive = false; clearInterval(t); };
  }, []);
  return p;
}
