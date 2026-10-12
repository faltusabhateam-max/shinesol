import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
const UPSTREAMS = [process.env.SOLANA_RPC_URL || "https://solana-rpc.publicnode.com", "https://api.mainnet-beta.solana.com"];
const ALLOWED = new Set([
  "getBalance", "getLatestBlockhash", "getFeeForMessage", "getSignaturesForAddress", "getTransaction", "getSignatureStatuses",
  "sendTransaction", "simulateTransaction", "getAccountInfo", "getMultipleAccounts", "getMinimumBalanceForRentExemption",
  "getSlot", "getBlockHeight", "getEpochInfo", "getRecentPrioritizationFees", "getTokenAccountsByOwner", "getVersion", "getGenesisHash", "isBlockhashValid",
]);

/** Forward one JSON-RPC call, failing over between upstreams on rate limits / outages. */
async function forward(call: any): Promise<{ status: number; json: any }> {
  let last = "";
  for (const url of UPSTREAMS) {
    try {
      const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(call), cache: "no-store" });
      if (r.status === 429 || r.status >= 500) { last = `upstream ${r.status}`; continue; }
      const json = await r.json();
      // Public endpoints sometimes reject with a "limit" error; try the next upstream.
      if (json?.error && /limit|too many|rate/i.test(json.error.message || "")) { last = json.error.message; continue; }
      return { status: r.status, json };
    } catch (e: any) { last = e?.message || "fetch failed"; }
  }
  return { status: 502, json: { jsonrpc: "2.0", id: call?.id ?? null, error: { code: -32000, message: `RPC unavailable: ${last}` } } };
}

export async function POST(req: NextRequest) {
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const calls = Array.isArray(body) ? body : [body];
  if (calls.length > 25 || calls.some((c) => !c || !ALLOWED.has(c.method))) return NextResponse.json({ error: "Method not allowed" }, { status: 400 });
  const headers = { "content-type": "application/json", "cache-control": "no-store" };
  if (!Array.isArray(body)) {
    const r = await forward(body);
    return NextResponse.json(r.json, { status: r.status, headers });
  }
  // Public RPCs cap batch sizes (e.g. 1 getTransaction per batch), so fan batches out as individual calls.
  const out: any[] = new Array(calls.length);
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(5, calls.length) }, async () => {
    while (i < calls.length) { const n = i++; out[n] = (await forward(calls[n])).json; }
  }));
  return NextResponse.json(out, { headers });
}
