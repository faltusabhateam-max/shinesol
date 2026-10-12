import "server-only";
import { deleteWithSub, getDocData, setFields } from "./server-admin";

/** Wipe a support thread's messages and reset it for a fresh conversation. */
export async function clearSupport(uid: string) {
  const t = await getDocData(`shine_support/${uid}`);
  if (!t) return;
  await deleteWithSub(`shine_support/${uid}`, "messages");
  await setFields(`shine_support/${uid}`, { uid, username: t.username || "", name: t.name || "", avatar: t.avatar || "", role: t.role || "user", lastMessage: "", lastFrom: "user", unreadForSupport: false, unreadForUser: false, endedAt: null, clearedAt: new Date(), createdAt: t.createdAt ? new Date(t.createdAt) : new Date(), updatedAt: new Date() });
}

