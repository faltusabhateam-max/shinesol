import { NextRequest } from "next/server";
import { createHmac } from "crypto";
import { generateAuthenticationOptions, generateRegistrationOptions, verifyAuthenticationResponse, verifyRegistrationResponse } from "@simplewebauthn/server";
import { getDocData, HttpError, requireUser, setFields } from "@/lib/server-admin";
import { SITE_URL } from "@/lib/config";
import { fail, json } from "@/lib/server-route";
export const runtime = "nodejs";

const path = (uid: string) => `shine_secure/${uid}`;
const ALLOWED = new Set([new URL(SITE_URL).host, "shinesol.vercel.app", "localhost:3000", "localhost:3311"]);
const b64 = (u: Uint8Array) => Buffer.from(u).toString("base64url");
const unb64 = (s: string) => new Uint8Array(Buffer.from(s, "base64url"));

/** Biometric (passkey) confirmation for wallet signing. Platform authenticator, user verification required. */
export async function POST(req: NextRequest) {
  try {
    const { uid } = await requireUser(req.headers.get("authorization"));
    const origin = req.headers.get("origin") || "";
    let host = ""; try { host = new URL(origin).host; } catch {}
    if (!ALLOWED.has(host)) throw new HttpError(400, "Passkeys aren't available on this domain.");
    const rpID = host.split(":")[0];
    const b = await req.json().catch(() => ({}));
    const d: any = (await getDocData(path(uid))) || {};
    const keys: any[] = d.passkeys || [];
    const now = Date.now();
    const signToken = () => { const exp = now + 5 * 60_000; return { signToken: `${exp}.${createHmac("sha256", process.env.SHINE_AUTH_SECRET || "").update(`bio:${uid}:${exp}`).digest("base64url")}`, expiresAt: exp }; };

    switch (b.action) {
      case "reg_options": {
        const opts = await generateRegistrationOptions({
          rpName: "Shine", rpID, userName: String(b.label || "Shine account").slice(0, 60), userID: new TextEncoder().encode(uid),
          attestationType: "none", authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required", residentKey: "preferred" },
          excludeCredentials: keys.map((k) => ({ id: k.id })),
        });
        await setFields(path(uid), { waChallenge: opts.challenge, waChallengeAt: new Date() });
        return json(opts);
      }
      case "reg_verify": {
        if (!d.waChallenge) throw new HttpError(409, "Start passkey setup again.");
        const v = await verifyRegistrationResponse({ response: b.response, expectedChallenge: d.waChallenge, expectedOrigin: origin, expectedRPID: rpID, requireUserVerification: true });
        if (!v.verified || !v.registrationInfo) throw new HttpError(401, "Couldn't verify your fingerprint / Face ID.");
        const c = v.registrationInfo.credential;
        const next = [...keys.filter((k) => k.id !== c.id), { id: c.id, publicKey: b64(c.publicKey), counter: c.counter, rpID, transports: c.transports || [], name: String(b.name || "This device").slice(0, 40), at: new Date().toISOString() }];
        await setFields(path(uid), { passkeys: next, bioEnabled: true, waChallenge: null });
        return json({ ok: true });
      }
      case "auth_options": {
        const mine = keys.filter((k) => k.rpID === rpID);
        if (!mine.length) throw new HttpError(409, "No passkey on this device. Set it up in Settings → Security.");
        const opts = await generateAuthenticationOptions({ rpID, userVerification: "required", allowCredentials: mine.map((k) => ({ id: k.id, transports: k.transports })) });
        await setFields(path(uid), { waChallenge: opts.challenge, waChallengeAt: new Date() });
        return json(opts);
      }
      case "auth_verify": {
        const k = keys.find((x) => x.id === b.response?.id);
        if (!k || !d.waChallenge) throw new HttpError(401, "Unknown passkey.");
        const v = await verifyAuthenticationResponse({ response: b.response, expectedChallenge: d.waChallenge, expectedOrigin: origin, expectedRPID: rpID, requireUserVerification: true, credential: { id: k.id, publicKey: unb64(k.publicKey), counter: k.counter, transports: k.transports } });
        if (!v.verified) throw new HttpError(401, "Biometric check failed.");
        await setFields(path(uid), { passkeys: keys.map((x) => (x.id === k.id ? { ...x, counter: v.authenticationInfo.newCounter } : x)), waChallenge: null });
        return json({ ok: true, ...signToken() });
      }
      case "toggle": {
        if (b.enabled && !keys.length) throw new HttpError(409, "Register a passkey first.");
        await setFields(path(uid), { bioEnabled: !!b.enabled });
        return json({ ok: true });
      }
      case "remove": {
        const next = keys.filter((k) => !String(k.id).startsWith(String(b.id || "~")));
        await setFields(path(uid), { passkeys: next, bioEnabled: next.length ? !!d.bioEnabled : false });
        return json({ ok: true });
      }
      default: throw new HttpError(400, "Unknown action.");
    }
  } catch (e) { return fail(e); }
}
