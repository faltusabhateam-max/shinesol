import "server-only";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { createHash, createHmac } from "crypto";

const APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID || "";
const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "";
const PROJECT = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "";
const JWKS = createRemoteJWKSet(new URL(`https://auth.privy.io/api/v1/apps/${APP_ID}/jwks.json`));
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;
export const SERVER_EMAIL = "shine-server@ops.shine.app";

export class HttpError extends Error { constructor(public status: number, msg: string) { super(msg); } }

export const adminEmails = () => (process.env.ADMIN_EMAILS || "").split(/[,\s]+/).map((e) => e.trim().toLowerCase()).filter(Boolean);

/** Verify a Privy access token (signature, issuer, audience, expiry) and return the Privy DID. */
export async function verifyPrivy(token: string) {
  if (!token) throw new HttpError(401, "Missing access token.");
  try {
    const { payload } = await jwtVerify(token, JWKS, { issuer: "privy.io", audience: APP_ID });
    const did = String(payload.sub || "");
    if (!did.startsWith("did:privy:")) throw new Error();
    return did;
  } catch { throw new HttpError(401, "Your session could not be verified. Please sign in again."); }
}

/** Fetch the Privy user record (server API, PRIVY_APP_SECRET). */
export async function privyUser(did: string): Promise<any> {
  const secret = process.env.PRIVY_APP_SECRET;
  if (!secret) throw new HttpError(500, "PRIVY_APP_SECRET is not configured.");
  const r = await fetch(`https://auth.privy.io/api/v1/users/${encodeURIComponent(did)}`, {
    headers: { authorization: `Basic ${Buffer.from(`${APP_ID}:${secret}`).toString("base64")}`, "privy-app-id": APP_ID }, cache: "no-store",
  });
  if (!r.ok) throw new HttpError(502, "Could not verify your account with Privy.");
  return r.json();
}
/** The user's Solana wallet addresses as registered with Privy (embedded first). */
export async function privySolWallets(did: string): Promise<string[]> {
  const u = await privyUser(did);
  return (u.linked_accounts || []).filter((a: any) => a.type === "wallet" && a.chain_type === "solana" && a.address)
    .sort((a: any, b: any) => (a.wallet_client_type === "privy" ? -1 : 0) - (b.wallet_client_type === "privy" ? -1 : 0)).map((a: any) => String(a.address));
}

const uidCache = new Map<string, string>();
/** Any signed-in Shine account: verifies the Privy token and resolves the caller's Firebase uid. */
export async function requireUser(authHeader: string | null) {
  const did = await verifyPrivy((authHeader || "").replace(/^Bearer\s+/i, ""));
  let uid = uidCache.get(did);
  if (!uid) { const c = bridgeCredentials(did); uid = (await signIn(c.email, c.password)).uid; uidCache.set(did, uid); }
  return { did, uid };
}

/** Look up the user's verified email via the Privy server API (uses PRIVY_APP_SECRET). */
export async function privyEmail(did: string): Promise<string | null> {
  const secret = process.env.PRIVY_APP_SECRET;
  if (!secret) throw new HttpError(500, "PRIVY_APP_SECRET is not configured.");
  const r = await fetch(`https://auth.privy.io/api/v1/users/${encodeURIComponent(did)}`, {
    headers: { authorization: `Basic ${Buffer.from(`${APP_ID}:${secret}`).toString("base64")}`, "privy-app-id": APP_ID },
    cache: "no-store",
  });
  if (!r.ok) throw new HttpError(502, "Could not verify your account with Privy.");
  const u = await r.json();
  const acct = (u.linked_accounts || []).find((a: any) => a.type === "email" && a.address);
  return acct ? String(acct.address).toLowerCase() : null;
}

export function bridgeCredentials(did: string) {
  const secret = process.env.SHINE_AUTH_SECRET!;
  const id = createHash("sha256").update(did).digest("hex").slice(0, 40);
  return { email: `${id}@users.shine.app`, password: createHmac("sha256", secret).update(did).digest("base64url") };
}

async function signIn(email: string, password: string) {
  const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password, returnSecureToken: true }), cache: "no-store",
  });
  const j = await r.json();
  if (!r.ok) throw new HttpError(500, `Auth error: ${j?.error?.message || r.status}`);
  return { uid: j.localId as string, idToken: j.idToken as string, exp: Date.now() + (Number(j.expiresIn || 3600) - 120) * 1000 };
}

let serverTok: { idToken: string; exp: number; uid: string } | null = null;
/** Firebase ID token of Shine's server identity (privileged in Firestore rules). */
export async function serverToken() {
  if (serverTok && serverTok.exp > Date.now()) return serverTok;
  const secret = process.env.SHINE_AUTH_SECRET;
  if (!secret) throw new HttpError(500, "SHINE_AUTH_SECRET is not configured.");
  serverTok = await signIn(SERVER_EMAIL, createHmac("sha256", secret).update("shine-server-admin").digest("base64url"));
  return serverTok;
}

/** Full admin check: valid Privy token + email in ADMIN_EMAILS. Returns the caller's Firebase uid. */
export async function requireAdmin(authHeader: string | null) {
  const did = await verifyPrivy((authHeader || "").replace(/^Bearer\s+/i, ""));
  const list = adminEmails();
  if (!list.length) throw new HttpError(403, "No administrators are configured (ADMIN_EMAILS is empty).");
  const email = await privyEmail(did);
  if (!email || !list.includes(email)) throw new HttpError(403, "This account is not authorized to access the Shine admin panel.");
  const c = bridgeCredentials(did);
  const { uid } = await signIn(c.email, c.password);
  return { did, email, uid };
}

/* ---------- Firestore REST (as the server identity) ---------- */
type V = any;
export function enc(v: any): V {
  if (v === null || v === undefined) return { nullValue: null };
  if (v instanceof Date) return { timestampValue: v.toISOString() };
  if (typeof v === "boolean") return { booleanValue: v };
  if (typeof v === "number") return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === "string") return { stringValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(enc) } };
  return { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, enc(x)])) } };
}
export function dec(v: V): any {
  if (!v) return null;
  if ("stringValue" in v) return v.stringValue;
  if ("integerValue" in v) return Number(v.integerValue);
  if ("doubleValue" in v) return v.doubleValue;
  if ("booleanValue" in v) return v.booleanValue;
  if ("timestampValue" in v) return v.timestampValue;
  if ("nullValue" in v) return null;
  if ("arrayValue" in v) return (v.arrayValue.values || []).map(dec);
  if ("mapValue" in v) return Object.fromEntries(Object.entries(v.mapValue.fields || {}).map(([k, x]) => [k, dec(x)]));
  return null;
}
async function fs(path: string, init: RequestInit = {}) {
  const { idToken } = await serverToken();
  const r = await fetch(path.startsWith("http") ? path : `${BASE}${path}`, { ...init, headers: { "content-type": "application/json", authorization: `Bearer ${idToken}`, ...(init.headers || {}) }, cache: "no-store" });
  if (r.status === 404) return null;
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new HttpError(500, `Firestore: ${j?.error?.message || r.status}`);
  return j;
}
export async function getDocData(path: string) {
  const j = await fs(`/${path}`);
  return j ? dec({ mapValue: { fields: j.fields || {} } }) : null;
}
export async function setFields(path: string, data: Record<string, any>) {
  const mask = Object.keys(data).map((k) => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join("&");
  await fs(`/${path}?${mask}`, { method: "PATCH", body: JSON.stringify({ fields: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, enc(v)])) }) });
}
export async function deleteDocPath(path: string) { await fs(`/${path}`, { method: "DELETE" }); }
export async function queryIds(collection: string, field: string, op: "EQUAL" | "ARRAY_CONTAINS", value: string): Promise<string[]> {
  const j = await fs(`:runQuery`, { method: "POST", body: JSON.stringify({ structuredQuery: { from: [{ collectionId: collection }], where: { fieldFilter: { field: { fieldPath: field }, op, value: enc(value) } }, select: { fields: [{ fieldPath: "__name__" }] }, limit: 500 } }) });
  return (j || []).filter((x: any) => x.document).map((x: any) => x.document.name.split("/").pop());
}
export async function listIds(parentPath: string, coll: string): Promise<string[]> {
  const out: string[] = [];
  let token = "";
  do {
    const j = await fs(`/${parentPath}/${coll}?pageSize=300&mask.fieldPaths=_n${token ? `&pageToken=${token}` : ""}`);
    (j?.documents || []).forEach((d: any) => out.push(d.name.split("/").pop()));
    token = j?.nextPageToken || "";
  } while (token);
  return out;
}
export async function deleteWithSub(path: string, sub?: string) {
  if (sub) for (const id of await listIds(path, sub)) await deleteDocPath(`${path}/${sub}/${id}`);
  await deleteDocPath(path);
}

/** Create a document only if it doesn't exist yet. Returns false when it already exists (used as an idempotency lock). */
export async function createOnce(collection: string, id: string, data: Record<string, any>) {
  const { idToken } = await serverToken();
  const r = await fetch(`${BASE}/${collection}?documentId=${encodeURIComponent(id)}`, {
    method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${idToken}` }, cache: "no-store",
    body: JSON.stringify({ fields: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, enc(v)])) }),
  });
  if (r.status === 409) return false;
  if (!r.ok) throw new HttpError(500, `Firestore: ${(await r.json().catch(() => ({})))?.error?.message || r.status}`);
  return true;
}
/** Add a document with an auto id. */
export async function addDocData(collection: string, data: Record<string, any>) {
  const j = await fs(`/${collection}`, { method: "POST", body: JSON.stringify({ fields: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, enc(v)])) }) });
  return String(j?.name || "").split("/").pop()!;
}
/** Query full documents (equality filters, AND). */
export async function queryDocs(collection: string, filters: [string, "EQUAL" | "ARRAY_CONTAINS", any][] = [], max = 300): Promise<any[]> {
  const where = filters.length === 0 ? undefined : filters.length === 1
    ? { fieldFilter: { field: { fieldPath: filters[0][0] }, op: filters[0][1], value: enc(filters[0][2]) } }
    : { compositeFilter: { op: "AND", filters: filters.map(([f, op, v]) => ({ fieldFilter: { field: { fieldPath: f }, op, value: enc(v) } })) } };
  const j = await fs(`:runQuery`, { method: "POST", body: JSON.stringify({ structuredQuery: { from: [{ collectionId: collection }], ...(where ? { where } : {}), limit: max } }) });
  return (j || []).filter((x: any) => x.document).map((x: any) => ({ id: x.document.name.split("/").pop(), ...dec({ mapValue: { fields: x.document.fields || {} } }) }));
}
/** List documents of a subcollection with data. */
export async function listDocs(path: string, max = 300): Promise<any[]> {
  const j = await fs(`/${path}?pageSize=${max}`);
  return (j?.documents || []).map((d: any) => ({ id: d.name.split("/").pop(), ...dec({ mapValue: { fields: d.fields || {} } }) }));
}
/** Ordered query (single collection), newest first by default. */
export async function queryOrdered(collection: string, field: string, dir: "DESCENDING" | "ASCENDING" = "DESCENDING", max = 500, filters: [string, "EQUAL", any][] = []): Promise<any[]> {
  const where = filters.length ? (filters.length === 1 ? { fieldFilter: { field: { fieldPath: filters[0][0] }, op: "EQUAL", value: enc(filters[0][2]) } } : { compositeFilter: { op: "AND", filters: filters.map(([f, , v]) => ({ fieldFilter: { field: { fieldPath: f }, op: "EQUAL", value: enc(v) } })) } }) : undefined;
  const j = await fs(`:runQuery`, { method: "POST", body: JSON.stringify({ structuredQuery: { from: [{ collectionId: collection }], ...(where ? { where } : {}), orderBy: [{ field: { fieldPath: field }, direction: dir }], limit: max } }) });
  return (j || []).filter((x: any) => x.document).map((x: any) => ({ id: x.document.name.split("/").pop(), ...dec({ mapValue: { fields: x.document.fields || {} } }) }));
}
/** Server-side COUNT aggregation. */
export async function countDocs(collection: string, filters: [string, "EQUAL", any][] = []) {
  const where = filters.length ? { fieldFilter: { field: { fieldPath: filters[0][0] }, op: "EQUAL", value: enc(filters[0][2]) } } : undefined;
  const j = await fs(`:runAggregationQuery`, { method: "POST", body: JSON.stringify({ structuredAggregationQuery: { structuredQuery: { from: [{ collectionId: collection }], ...(where ? { where } : {}) }, aggregations: [{ alias: "n", count: {} }] } }) });
  return Number(j?.[0]?.result?.aggregateFields?.n?.integerValue || 0);
}
