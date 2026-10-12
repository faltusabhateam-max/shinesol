import { NextRequest, NextResponse } from "next/server";
import { adminEmails, getDocData, HttpError, requireAdmin, setFields } from "@/lib/server-admin";
export const runtime = "nodejs";

/**
 * Verifies the caller is an allow-listed admin (Privy token + ADMIN_EMAILS), then registers their
 * Firebase uid in shine_meta/admins (server-only doc) so Firestore rules grant admin read access.
 * Admins whose email was removed from ADMIN_EMAILS are pruned on every call.
 */
export async function POST(req: NextRequest) {
  try {
    const me = await requireAdmin(req.headers.get("authorization"));
    const allowed = new Set(adminEmails());
    const cur = (await getDocData("shine_meta/admins")) || {};
    const emails: Record<string, string> = Object.fromEntries(Object.entries(cur.emails || {}).filter(([, e]) => allowed.has(String(e).toLowerCase())) as [string, string][]);
    emails[me.uid] = me.email;
    await setFields("shine_meta/admins", { uids: Object.keys(emails), emails, updatedAt: new Date() });
    return NextResponse.json({ ok: true, email: me.email, uid: me.uid }, { headers: { "cache-control": "no-store" } });
  } catch (e: any) {
    const status = e instanceof HttpError ? e.status : 500;
    return NextResponse.json({ error: e?.message || "Admin check failed." }, { status });
  }
}
