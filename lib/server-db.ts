import "server-only";
const PID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const base = () => `https://firestore.googleapis.com/v1/projects/${PID}/databases/(default)/documents`;

export type PublicUser = { username: string; avatar: string; name: string; bio: string; role: string };

/** Read a public Shine profile via the Firestore REST API (public-read collections only). */
export async function fetchPublicUser(username: string): Promise<PublicUser | null> {
  try {
    const n = await fetch(`${base()}/shine_usernames/${encodeURIComponent(username.toLowerCase())}?key=${KEY}`, { next: { revalidate: 120 } });
    if (!n.ok) return null;
    const uid = (await n.json())?.fields?.uid?.stringValue;
    if (!uid) return null;
    const u = await fetch(`${base()}/shine_users/${encodeURIComponent(uid)}?key=${KEY}`, { next: { revalidate: 120 } });
    if (!u.ok) return null;
    const f = (await u.json())?.fields || {};
    const role = f.role?.stringValue || "user";
    const pname = f.project?.mapValue?.fields?.name?.stringValue;
    const uname = f.username?.stringValue || username;
    return { username: uname, avatar: f.avatar?.stringValue || "1", name: role === "project" && pname ? pname : uname, bio: f.bio?.stringValue || "", role };
  } catch {
    return null;
  }
}
export const siteBase = () =>
  (process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000")).replace(/\/$/, "");

export type PublicPost = { id: string; text: string; projectName: string; authorUsername: string; authorAvatar: string; image: string | null; status: string };
/** Read a public post via the Firestore REST API. */
export async function fetchPublicPost(id: string): Promise<PublicPost | null> {
  try {
    if (!/^[A-Za-z0-9_-]{4,64}$/.test(id)) return null;
    const r = await fetch(`${base()}/shine_posts/${id}?key=${KEY}`, { next: { revalidate: 60 } });
    if (!r.ok) return null;
    const f = (await r.json())?.fields || {};
    return { id, text: f.text?.stringValue || "", projectName: f.projectName?.stringValue || "Shine", authorUsername: f.authorUsername?.stringValue || "", authorAvatar: f.authorAvatar?.stringValue || "1", image: f.image?.stringValue || null, status: f.status?.stringValue || "open" };
  } catch { return null; }
}
