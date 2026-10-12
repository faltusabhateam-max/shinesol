"use client";
import { collection, doc, getDoc, increment, serverTimestamp, updateDoc, writeBatch } from "firebase/firestore";
import { fb } from "./firebase";
import { C } from "./config";
import type { ShineUser } from "./types";

export type Reply = { id: string; uid: string; username: string; name: string; avatar: string; text: string; parentId: string | null; replyTo: string | null; likes?: number; createdAt?: any };

const postRef = (id: string) => doc(fb().db, C.posts, id);

export async function hasLiked(path: string, uid: string) {
  try { return (await getDoc(doc(fb().db, path, "likes", uid))).exists(); } catch { return false; }
}
/** Likes a post (path = shine_posts/{id}) or a comment (path = shine_posts/{id}/replies/{rid}). One like per user, counter kept in sync atomically. */
export async function setLike(path: string, uid: string, like: boolean) {
  const { db } = fb();
  const b = writeBatch(db);
  const likeRef = doc(db, path, "likes", uid);
  if (like) b.set(likeRef, { uid, createdAt: serverTimestamp() }); else b.delete(likeRef);
  b.update(doc(db, path), { likes: increment(like ? 1 : -1) });
  await b.commit();
}
export async function addReply(postId: string, p: ShineUser, text: string, parent?: Reply | null) {
  const { db } = fb();
  const ref = doc(collection(db, C.posts, postId, "replies"));
  const b = writeBatch(db);
  b.set(ref, {
    uid: p.uid, username: p.username, name: p.role === "project" && p.project?.name ? p.project.name.slice(0, 80) : p.username,
    avatar: p.avatar && p.avatar.length <= 200 ? p.avatar : "custom", text: text.slice(0, 1000),
    parentId: parent?.id ?? null, replyTo: parent?.username ?? null, likes: 0, createdAt: serverTimestamp(),
  });
  b.update(postRef(postId), { replies: increment(1), lastReplyId: ref.id });
  await b.commit();
  return ref.id;
}
export async function deleteReply(postId: string, replyId: string) {
  const { db } = fb();
  const b = writeBatch(db);
  b.delete(doc(db, C.posts, postId, "replies", replyId));
  b.update(postRef(postId), { replies: increment(-1), lastReplyId: replyId });
  await b.commit();
}
export async function bumpShare(postId: string) {
  try { await updateDoc(postRef(postId), { shares: increment(1) }); } catch {}
}
export async function sharePost(postId: string, title: string) {
  const url = `${window.location.origin}/p/${postId}`;
  try {
    if (navigator.share && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)) { await navigator.share({ title, url }); return "shared"; }
  } catch (e: any) { if (e?.name === "AbortError") return "cancelled"; }
  await navigator.clipboard.writeText(url);
  return "copied";
}
