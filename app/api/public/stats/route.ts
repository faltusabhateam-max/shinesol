import { countDocs, queryOrdered } from "@/lib/server-admin";
import { solUsd, vaultAddress, vaultBalance } from "@/lib/server-sol";
import { fail } from "@/lib/server-route";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const day = (iso: string) => iso.slice(0, 10);
/** Public transparency stats: totals, daily series and live vault balance. */
export async function GET() {
  try {
    const [rows, price, users, projects] = await Promise.all([
      queryOrdered("shine_ledger", "at", "ASCENDING", 5000),
      solUsd().catch(() => null), countDocs("shine_users"), countDocs("shine_users", [["role", "EQUAL", "project"]]),
    ]);
    let vault: { address: string | null; balance: number | null } = { address: null, balance: null };
    try { vault = { address: vaultAddress(), balance: await vaultBalance() }; } catch {}
    const sum = (f: (r: any) => boolean) => rows.filter(f).reduce((a, r) => ({ sol: a.sol + (r.sol || 0), usd: a.usd + (r.usd || 0) }), { sol: 0, usd: 0 });
    const isRevenue = (r: any) => r.type === "fee" || r.type === "verify" || r.type === "affiliate" || r.type === "dispute";
    const days: Record<string, { fees: number; verify: number; affiliate: number; paid: number; feesUsd: number }> = {};
    for (const r of rows) {
      const d = day(String(r.at));
      const x = (days[d] ||= { fees: 0, verify: 0, affiliate: 0, paid: 0, feesUsd: 0 });
      if (r.type === "fee") { x.fees += r.sol; x.feesUsd += r.usd || 0; }
      if (r.type === "verify") x.verify += r.sol;
      if (r.type === "affiliate" || r.type === "dispute") x.affiliate += r.sol;
      if (r.type === "payout") x.paid += r.sol;
    }
    // Fill the last 30 days so charts have a continuous axis.
    const series: any[] = [];
    let cum = 0, cumPaid = 0;
    const first = rows.length ? new Date(day(String(rows[0].at))) : new Date(Date.now() - 29 * 864e5);
    const start = new Date(Math.min(first.getTime(), Date.now() - 29 * 864e5));
    for (let t = start.getTime(); t <= Date.now(); t += 864e5) {
      const d = new Date(t).toISOString().slice(0, 10);
      const x = days[d] || { fees: 0, verify: 0, affiliate: 0, paid: 0, feesUsd: 0 };
      cum += x.fees + x.verify + x.affiliate; cumPaid += x.paid;
      series.push({ day: d, ...x, revenue: x.fees + x.verify + x.affiliate, cumulative: cum, cumulativePaid: cumPaid });
    }
    const body = {
      updatedAt: new Date().toISOString(), price,
      totals: {
        revenue: sum(isRevenue), fees: sum((r) => r.type === "fee"), withdrawFees: sum((r) => r.type === "fee" && r.source === "withdraw"), paymentFees: sum((r) => r.type === "fee" && r.source !== "withdraw"),
        verify: sum((r) => r.type === "verify"), affiliate: sum((r) => r.type === "affiliate"), dispute: sum((r) => r.type === "dispute"), paidToCreators: sum((r) => r.type === "payout"), escrowFunded: sum((r) => r.type === "escrow_fund"), refunds: sum((r) => r.type === "escrow_refund"),
        verifySubscriptions: rows.filter((r) => r.type === "verify").length, txCount: rows.length,
      },
      vault, users, projects, series,
    };
    return Response.json(body, { headers: { "cache-control": "public, s-maxage=60, stale-while-revalidate=300", "access-control-allow-origin": "*" } });
  } catch (e) { return fail(e); }
}
