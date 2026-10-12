import { NextRequest, NextResponse } from "next/server";
import { deleteDocPath, deleteWithSub, getDocData, HttpError, listIds, queryIds, requireAdmin, setFields } from "@/lib/server-admin";
import { clearSupport } from "@/lib/server-support";
import { audit } from "@/lib/server-escrow";
export const runtime = "nodejs";

type Body = { action: "verify" | "unverify" | "deactivate" | "reactivate" | "deleteUser" | "deletePost" | "affiliate_revoke" | "affiliate_disable" | "support_clear"; uid?: string; postId?: string; projectUid?: string; mode?: "permanent" | "timed"; months?: number };
const ID = /^[A-Za-z0-9_-]{6,128}$/;

async function flags() {
  const f = (await getDocData("shine_meta/flags")) || {};
  return { verified: new Set<string>(f.verified || []), deactivated: new Set<string>(f.deactivated || []) };
}
async function saveFlags(f: { verified: Set<string>; deactivated: Set<string> }) {
  await setFields("shine_meta/flags", { verified: [...f.verified], deactivated: [...f.deactivated], updatedAt: new Date() });
}

/** Deletes a post with its likes, replies and reply likes. */
async function deletePostDeep(id: string) {
  for (const r of await listIds(`shine_posts/${id}`, "replies")) await deleteWithSub(`shine_posts/${id}/replies/${r}`, "likes");
  await deleteWithSub(`shine_posts/${id}`, "likes");
}

async function affiliateAdmin(b: Body) {
  const f = (await getDocData("shine_meta/flags")) || {};
  const a = { ...(f.affiliates || {}) };
  const pid = b.projectUid!;
  const aff = await getDocData(`shine_affiliates/${pid}`);
  if (!aff) throw new HttpError(404, "Affiliate program not found.");
  let members: any[] = aff.members || [];
  if (b.action === "affiliate_revoke") { members = members.filter((m) => m.uid !== b.uid); if (a[b.uid!]?.p === pid) delete a[b.uid!]; }
  else { members.forEach((m) => { if (a[m.uid]?.p === pid) delete a[m.uid]; }); members = []; }
  await setFields(`shine_affiliates/${pid}`, { members: members.map((m) => ({ ...m, addedAt: new Date(m.addedAt) })), ...(b.action === "affiliate_disable" ? { enabled: false } : {}), updatedAt: new Date() });
  await setFields("shine_meta/flags", { affiliates: a });
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req.headers.get("authorization"));
    const b = (await req.json()) as Body;
    if (b.action === "deletePost") {
      if (!b.postId || !ID.test(b.postId)) throw new HttpError(400, "Invalid post id.");
      await deletePostDeep(b.postId);
      return NextResponse.json({ ok: true });
    }
    if (b.action === "support_clear") {
      if (!b.uid || !ID.test(b.uid)) throw new HttpError(400, "Invalid user id.");
      await clearSupport(b.uid);
      await audit({ type: "support_clear", uid: b.uid, by: admin.uid, admin: (admin as any).email || null });
      return NextResponse.json({ ok: true });
    }
    if (b.action === "affiliate_revoke" || b.action === "affiliate_disable") {
      if (!b.projectUid || !ID.test(b.projectUid) || (b.action === "affiliate_revoke" && (!b.uid || !ID.test(b.uid)))) throw new HttpError(400, "Invalid id.");
      await affiliateAdmin(b);
      return NextResponse.json({ ok: true });
    }
    if (!b.uid || !ID.test(b.uid)) throw new HttpError(400, "Invalid user id.");
    const user = await getDocData(`shine_users/${b.uid}`);
    const f = await flags();
    switch (b.action) {
      case "verify": {
        if (!user) throw new HttpError(404, "Account not found.");
        if (b.mode === "timed") {
          const months = Math.max(1, Math.min(36, Math.round(Number(b.months) || 1)));
          const cur = (await getDocData("shine_meta/flags")) || {};
          const vu: Record<string, Date> = Object.fromEntries(Object.entries(cur.verifiedUntil || {}).map(([k, v]) => [k, new Date(v as string)]));
          const base = vu[b.uid] && vu[b.uid].getTime() > Date.now() ? vu[b.uid] : new Date();
          const until = new Date(base); until.setMonth(until.getMonth() + months);
          vu[b.uid] = until;
          await setFields("shine_meta/flags", { verifiedUntil: vu });
          await audit({ type: "admin_verify_timed", uid: b.uid, by: admin.uid, until });
          return NextResponse.json({ ok: true, until });
        }
        // Permanent Shine-team badge: never expires until an admin revokes it.
        f.verified.add(b.uid);
        await audit({ type: "admin_verify_permanent", uid: b.uid, by: admin.uid });
        break;
      }
      case "unverify": {
        f.verified.delete(b.uid);
        const cur = (await getDocData("shine_meta/flags")) || {};
        const vu = Object.fromEntries(Object.entries(cur.verifiedUntil || {}).filter(([k]) => k !== b.uid).map(([k, v]) => [k, new Date(v as string)]));
        await setFields("shine_meta/flags", { verifiedUntil: vu });
        break;
      }
      case "deactivate":
        if (b.uid === admin.uid) throw new HttpError(400, "You can't deactivate your own account.");
        f.deactivated.add(b.uid); break;
      case "reactivate": f.deactivated.delete(b.uid); break;
      case "deleteUser": {
        if (b.uid === admin.uid) throw new HttpError(400, "You can't delete your own account.");
        const posts = await queryIds("shine_posts", "authorUid", "EQUAL", b.uid);
        for (const p of posts) await deletePostDeep(p);
        const apps = new Set([...(await queryIds("shine_applications", "applicantUid", "EQUAL", b.uid)), ...(await queryIds("shine_applications", "projectUid", "EQUAL", b.uid))]);
        for (const a of apps) await deleteDocPath(`shine_applications/${a}`);
        for (const c of await queryIds("shine_chats", "members", "ARRAY_CONTAINS", b.uid)) await deleteWithSub(`shine_chats/${c}`, "messages");
        await deleteWithSub(`shine_support/${b.uid}`, "messages");
        if (user?.usernameLower) await deleteDocPath(`shine_usernames/${user.usernameLower}`);
        await deleteDocPath(`shine_users/${b.uid}`);
        f.verified.delete(b.uid);
        await saveFlags(f);
        return NextResponse.json({ ok: true, deleted: { posts: posts.length, applications: apps.size } });
      }
      default: throw new HttpError(400, "Unknown action.");
    }
    await saveFlags(f);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    const status = e instanceof HttpError ? e.status : 500;
    return NextResponse.json({ error: e?.message || "Action failed." }, { status });
  }
}
