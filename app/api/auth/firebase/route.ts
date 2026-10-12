import { NextRequest, NextResponse } from "next/server";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { createHash, createHmac } from "crypto";
export const runtime = "nodejs";

const APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID || "";
const JWKS = createRemoteJWKSet(new URL(`https://auth.privy.io/api/v1/apps/${APP_ID}/jwks.json`));

/**
 * Exchanges a verified Privy access token for deterministic Firebase email/password credentials.
 * The password is an HMAC of the Privy user id with a server-only secret, so only the
 * authenticated Privy user can obtain it. No Privy secrets ever reach the client.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.SHINE_AUTH_SECRET;
  if (!APP_ID || !secret) return NextResponse.json({ error: "Server auth is not configured." }, { status: 500 });
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "Missing access token." }, { status: 401 });
  try {
    const { payload } = await jwtVerify(token, JWKS, { issuer: "privy.io", audience: APP_ID });
    const did = String(payload.sub || "");
    if (!did.startsWith("did:privy:")) throw new Error("bad subject");
    const id = createHash("sha256").update(did).digest("hex").slice(0, 40);
    const email = `${id}@users.shine.app`;
    const password = createHmac("sha256", secret).update(did).digest("base64url");
    return NextResponse.json({ email, password, did }, { headers: { "cache-control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Your session could not be verified. Please sign in again." }, { status: 401 });
  }
}
