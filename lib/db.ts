"use client";
import {
  collection, doc, getDoc, getDocs, query, where, orderBy, limit, runTransaction, serverTimestamp, setDoc, updateDoc, deleteDoc,
  addDoc, writeBatch, Timestamp, increment,
} from "firebase/firestore";
import { fb } from "./firebase";
import { C } from "./config";
import type { Application, Chat, FormField, Post, ProjectInfo, ShineUser } from "./types";

export const USERNAME_RE = /^[A-Za-z0-9_]{1,15}$/;

export type ProfileInput = { xHandle: string; telegram: string; discord: string; avatar: string; bio: string; wallet?: string | null };

export async function saveProfile(uid: string, input: ProfileInput, existing: ShineUser | null) {
  const { db } = fb();
  const username = input.xHandle.trim();
  if (!USERNAME_RE.test(username)) throw new Error("Enter a valid X username (letters, numbers and underscores, up to 15 characters).");
  const lower = username.toLowerCase();
  await runTransaction(db, async (tx) => {
    const nameRef = doc(db, C.usernames, lower);
    const nameSnap = await tx.get(nameRef);
    if (nameSnap.exists() && nameSnap.data().uid !== uid) throw new Error(`@${username} is already registered on Shine.`);
    if (existing?.usernameLower && existing.usernameLower !== lower) tx.delete(doc(db, C.usernames, existing.usernameLower));
    if (!nameSnap.exists()) tx.set(nameRef, { uid, createdAt: serverTimestamp() });
    const userRef = doc(db, C.users, uid);
    const base = {
      uid,
      username,
      usernameLower: lower,
      xHandle: username,
      telegram: input.telegram.trim(),
      discord: input.discord.trim(),
      avatar: input.avatar,
      bio: input.bio,
      updatedAt: serverTimestamp(),
    };
    if (existing) tx.update(userRef, base);
    else tx.set(userRef, { ...base, wallet: input.wallet || "", role: "user", project: null, createdAt: serverTimestamp() });
  });
}

export async function switchToProject(uid: string, project: ProjectInfo) {
  const { db } = fb();
  await updateDoc(doc(db, C.users, uid), { role: "project", project, updatedAt: serverTimestamp() });
}
export async function updateProject(uid: string, project: ProjectInfo) {
  const { db } = fb();
  await updateDoc(doc(db, C.users, uid), { project, updatedAt: serverTimestamp() });
}

export async function getUserByUsername(username: string): Promise<ShineUser | null> {
  const { db } = fb();
  const n = await getDoc(doc(db, C.usernames, username.toLowerCase()));
  if (!n.exists()) return null;
  const u = await getDoc(doc(db, C.users, n.data().uid));
  return u.exists() ? ({ uid: u.id, ...(u.data() as any) } as ShineUser) : null;
}

export async function listUsers(): Promise<ShineUser[]> {
  const { db } = fb();
  const s = await getDocs(query(collection(db, C.users), orderBy("createdAt", "desc"), limit(300)));
  return s.docs.map((d) => ({ uid: d.id, ...(d.data() as any) }) as ShineUser).filter((u) => u.username);
}

export const displayName = (u?: Pick<ShineUser, "role" | "project" | "username"> | null) => (u?.role === "project" && u.project?.name ? u.project.name : u?.username || "");
export const socialsOf = (u: ShineUser) =>
  u.role === "project" && u.project
    ? { x: u.project.x || u.xHandle, telegram: u.project.telegram || u.telegram, discord: u.project.discord || u.discord }
    : { x: u.xHandle, telegram: u.telegram, discord: u.discord };

/* Posts */
export type PostInput = { text: string; image: string | null; imageRatio: number | null; form: FormField[]; endsAt: Date | null; steps?: import("./steps").ApplyStep[] };
export async function createPost(author: ShineUser, p: PostInput) {
  const { db } = fb();
  const ref = await addDoc(collection(db, C.posts), {
    authorUid: author.uid,
    authorUsername: author.username,
    authorAvatar: author.avatar,
    projectName: author.project?.name || author.username,
    text: p.text,
    image: p.image,
    imageRatio: p.imageRatio,
    form: p.form,
    steps: p.steps || [],
    applicants: 0,
    status: "open",
    endsAt: p.endsAt ? Timestamp.fromDate(p.endsAt) : null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}
export async function updatePost(id: string, p: Partial<PostInput> & { status?: "open" | "closed" }) {
  const { db } = fb();
  const data: any = { updatedAt: serverTimestamp() };
  if (p.text !== undefined) data.text = p.text;
  if (p.image !== undefined) data.image = p.image;
  if (p.imageRatio !== undefined) data.imageRatio = p.imageRatio;
  if (p.form !== undefined) data.form = p.form;
  if (p.steps !== undefined) data.steps = p.steps;
  if (p.endsAt !== undefined) data.endsAt = p.endsAt ? Timestamp.fromDate(p.endsAt) : null;
  if (p.status !== undefined) data.status = p.status;
  await updateDoc(doc(db, C.posts, id), data);
}
export async function deletePost(id: string) {
  const { db } = fb();
  await deleteDoc(doc(db, C.posts, id));
}
export async function getPost(id: string): Promise<Post | null> {
  const { db } = fb();
  const s = await getDoc(doc(db, C.posts, id));
  return s.exists() ? ({ id: s.id, ...(s.data() as any) } as Post) : null;
}

/* Applications */
export const appId = (postId: string, uid: string) => `${postId}_${uid}`;
export async function submitApplication(a: Omit<Application, "id" | "status" | "createdAt" | "decidedAt">) {
  const { db } = fb();
  const id = appId(a.postId, a.applicantUid);
  // Application + applicant counter are written atomically (rules require both).
  const b = writeBatch(db);
  b.set(doc(db, C.applications, id), { ...a, status: "pending", createdAt: serverTimestamp(), decidedAt: null });
  b.update(doc(db, C.posts, a.postId), { applicants: increment(1) });
  await b.commit();
  return id;
}
export async function getMyApplication(postId: string, uid: string): Promise<Application | null> {
  const { db } = fb();
  try {
    const s = await getDoc(doc(db, C.applications, appId(postId, uid)));
    return s.exists() ? ({ id: s.id, ...(s.data() as any) } as Application) : null;
  } catch {
    return null;
  }
}

export async function decideApplication(app: Application, status: "approved" | "rejected", project: ShineUser) {
  const { db } = fb();
  const b = writeBatch(db);
  b.update(doc(db, C.applications, app.id), { status, decidedAt: serverTimestamp() });
  if (status === "approved") {
    const chat: Omit<Chat, "id"> = {
      members: [project.uid, app.applicantUid],
      projectUid: project.uid,
      applicantUid: app.applicantUid,
      projectName: project.project?.name || project.username,
      projectAvatar: project.avatar,
      applicantUsername: app.applicantUsername,
      applicantAvatar: app.applicantAvatar,
      postId: app.postId,
      postExcerpt: app.postExcerpt,
      lastMessage: "Application approved — chat unlocked.",
      updatedAt: serverTimestamp() as any,
    };
    b.set(doc(db, C.chats, app.id), chat, { merge: true });
  }
  await b.commit();
}

export async function myChats(uid: string): Promise<Chat[]> {
  const { db } = fb();
  const s = await getDocs(query(collection(db, C.chats), where("members", "array-contains", uid)));
  return s.docs.map((d) => ({ id: d.id, ...(d.data() as any) }) as Chat);
}
