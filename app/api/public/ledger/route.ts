import { NextRequest } from "next/server";
import { queryOrdered } from "@/lib/server-admin";
import { fail, json } from "@/lib/server-route";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Public, read-only on-chain ledger of every Shine fee, escrow, verification and affiliate transaction. */
export async function GET(req: NextRequest) {
  try {
    const type = req.nextUrl.searchParams.get("type");
    const max = Math.min(500, Number(req.nextUrl.searchParams.get("limit") || 200));
    const rows = await queryOrdered("shine_ledger", "at", "DESCENDING", type ? 500 : max);
    const out = rows.filter((r) => !type || r.type === type).slice(0, max).map((r) => ({ id: r.id, at: r.at, type: r.type, source: r.source, sol: r.sol, usd: r.usd, signature: r.signature, label: r.label }));
    return Response.json({ rows: out }, { headers: { "cache-control": "public, s-maxage=30, stale-while-revalidate=120", "access-control-allow-origin": "*" } });
  } catch (e) { return fail(e); }
}
