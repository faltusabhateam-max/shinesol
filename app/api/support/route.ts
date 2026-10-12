import { NextRequest } from "next/server";
import { clearSupport } from "@/lib/server-support";
import { getDocData, HttpError, requireUser, setFields } from "@/lib/server-admin";
import { audit } from "@/lib/server-escrow";
import { fail, json } from "@/lib/server-route";
export const runtime = "nodejs";

/** User-side: End chat, then Clear chat (only the user's own Shine Support thread). */
export async function POST(req: NextRequest) {
  try {
    const { uid } = await requireUser(req.headers.get("authorization"));
    const { action } = await req.json().catch(() => ({}));
    const t = await getDocData(`shine_support/${uid}`);
    if (!t) throw new HttpError(404, "No support conversation yet.");
    if (action === "end") { await setFields(`shine_support/${uid}`, { endedAt: new Date(), updatedAt: new Date() }); await audit({ type: "support_end", uid }); return json({ ok: true }); }
    if (action === "clear") {
      if (!t.endedAt) throw new HttpError(409, "End the chat before clearing it.");
      await clearSupport(uid); await audit({ type: "support_clear", uid, by: uid });
      return json({ ok: true });
    }
    if (action === "reopen") { await setFields(`shine_support/${uid}`, { endedAt: null }); return json({ ok: true }); }
    throw new HttpError(400, "Unknown action.");
  } catch (e) { return fail(e); }
}
