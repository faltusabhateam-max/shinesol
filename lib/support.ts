"use client";
import { addDoc, collection, doc, getDoc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { fb } from "./firebase";
import { C } from "./config";
import type { ShineUser, SupportMessage, SupportRequest, SupportRequestKind } from "./types";

export const REQUESTS: Record<Exclude<SupportRequestKind, "custom">, SupportRequest> = {
  x: { kind: "x", title: "Share your X account", fields: [{ key: "x", label: "X username", placeholder: "@username or x.com link" }] },
  project: {
    kind: "project", title: "Share your project details", fields: [
      { key: "name", label: "Project name", placeholder: "e.g. Shine" },
      { key: "website", label: "Website", placeholder: "https://" },
      { key: "x", label: "Project X account", placeholder: "@project" },
      { key: "telegram", label: "Telegram", placeholder: "@group or t.me link" },
      { key: "about", label: "What does the project do?", placeholder: "Short description", multiline: true },
    ],
  },
  telegram: { kind: "telegram", title: "Share your Telegram username", fields: [{ key: "telegram", label: "Telegram username", placeholder: "@username or t.me link" }] },
  wallet: { kind: "wallet", title: "Share your wallet address", fields: [{ key: "wallet", label: "Solana wallet address", placeholder: "Solana address" }] },
};

const threadRef = (uid: string) => doc(fb().db, C.support, uid);
const msgs = (uid: string) => collection(fb().db, C.support, uid, "messages");

function identity(p: ShineUser) {
  return { uid: p.uid, username: p.username, name: p.role === "project" && p.project?.name ? p.project.name : p.username, avatar: p.avatar && p.avatar.length < 200 ? p.avatar : "1", role: p.role };
}

export async function sendAsUser(p: ShineUser, data: Partial<SupportMessage>, preview: string) {
  const ref = threadRef(p.uid);
  const exists = (await getDoc(ref)).exists();
  await setDoc(ref, { ...identity(p), lastMessage: preview.slice(0, 180), lastFrom: "user", updatedAt: serverTimestamp(), unreadForSupport: true, ...(exists ? {} : { createdAt: serverTimestamp(), unreadForUser: false }) }, { merge: true });
  await addDoc(msgs(p.uid), { ...data, from: "user", senderUid: p.uid, createdAt: serverTimestamp() });
}

export async function sendAsSupport(threadUid: string, adminUid: string, data: Partial<SupportMessage>, preview: string) {
  await addDoc(msgs(threadUid), { ...data, from: "support", senderUid: adminUid, createdAt: serverTimestamp() });
  await setDoc(threadRef(threadUid), { uid: threadUid, lastMessage: preview.slice(0, 180), lastFrom: "support", updatedAt: serverTimestamp(), unreadForUser: true, unreadForSupport: false }, { merge: true });
}

export async function respondToRequest(p: ShineUser, msgId: string, response: Record<string, string>, title: string) {
  await updateDoc(doc(fb().db, C.support, p.uid, "messages", msgId), { response, respondedAt: serverTimestamp() });
  await setDoc(threadRef(p.uid), { ...identity(p), lastMessage: `Submitted: ${title}`.slice(0, 180), lastFrom: "user", updatedAt: serverTimestamp(), unreadForSupport: true }, { merge: true });
}

export async function markRead(uid: string, side: "user" | "support") {
  try { await updateDoc(threadRef(uid), side === "user" ? { unreadForUser: false } : { unreadForSupport: false }); } catch {}
}
