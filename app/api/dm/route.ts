import { NextRequest } from "next/server";
import { createOnce, getDocData, HttpError, requireUser } from "@/lib/server-admin";
import { isVerified } from "@/lib/server-flags";
import { fail, json } from "@/lib/server-route";
export const runtime = "nodejs";

/** Verified perk: open a direct chat with a project without applying or being hired. */
export async function POST(req: NextRequest) {
  try {
    const { uid } = await requireUser(req.headers.get("authorization"));
    const { projectUid } = await req.json().catch(() => ({}));
    if (typeof projectUid !== "string" || projectUid === uid) throw new HttpError(400, "Invalid project.");
    if (!(await isVerified(uid))) throw new HttpError(403, "Direct messages to projects are a Shine Verified perk.");
    const [me, proj, flags] = await Promise.all([getDocData(`shine_users/${uid}`), getDocData(`shine_users/${projectUid}`), getDocData("shine_meta/flags")]);
    if (!me || !proj || proj.role !== "project") throw new HttpError(404, "Project not found.");
    if ((flags?.deactivated || []).includes(projectUid) || (flags?.deactivated || []).includes(uid)) throw new HttpError(403, "This account is unavailable.");
    const id = `dm_${projectUid}_${uid}`;
    await createOnce("shine_chats", id, {
      members: [projectUid, uid], projectUid, applicantUid: uid, projectName: proj.project?.name || proj.username, projectAvatar: proj.avatar,
      applicantUsername: me.username, applicantAvatar: me.avatar, postId: "", postExcerpt: "Direct message · Shine Verified", direct: true,
      lastMessage: `@${me.username} started a conversation`, updatedAt: new Date(), createdAt: new Date(),
    });
    return json({ id });
  } catch (e) { return fail(e); }
}
