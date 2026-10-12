import { NextRequest } from "next/server";
import { getDocData, queryDocs, setFields } from "@/lib/server-admin";
import { chatSystem, savePlan } from "@/lib/server-escrow";
import type { EscrowPlan } from "@/lib/escrow";
import { json } from "@/lib/server-route";
export const runtime = "nodejs";
export const maxDuration = 60;

/** Daily Vercel cron: marks escrow periods due + prompts the project, and expires paid verifications. */
export async function GET(req: NextRequest) {
  if (!process.env.CRON_SECRET || req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return json({ error: "Unauthorized" }, 401);
  const now = Date.now();
  let due = 0, expired = 0;
  const plans = (await queryDocs("shine_escrow", [["status", "EQUAL", "active"]], 500)) as EscrowPlan[];
  for (const p of plans) {
    const idx = p.periods.findIndex((x) => x.status === "funded" && x.dueAt && new Date(x.dueAt).getTime() <= now);
    if (idx < 0) continue;
    const periods = [...p.periods];
    periods[idx] = { ...periods[idx], status: "due" };
    await savePlan(p.id, { periods });
    await chatSystem(p.id, `Payment #${periods[idx].n} is due. ${p.projectName}, please review the work and confirm the release to @${p.creatorUsername}.`, { kind: "due", n: periods[idx].n });
    due++;
  }
  const flags = (await getDocData("shine_meta/flags")) || {};
  const vu: Record<string, string> = flags.verifiedUntil || {};
  const keep = Object.fromEntries(Object.entries(vu).filter(([, t]) => new Date(t).getTime() > now));
  expired = Object.keys(vu).length - Object.keys(keep).length;
  if (expired) await setFields("shine_meta/flags", { verifiedUntil: Object.fromEntries(Object.entries(keep).map(([k, v]) => [k, new Date(v)])) });
  return json({ ok: true, due, expired });
}
