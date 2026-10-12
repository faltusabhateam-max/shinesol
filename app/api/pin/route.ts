import { NextRequest } from "next/server";
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { authenticator } from "otplib";
import { getDocData, HttpError, requireUser, setFields } from "@/lib/server-admin";
import { fail, json } from "@/lib/server-route";
export const runtime = "nodejs";

authenticator.options = { window: 1 };
const PEPPER = () => process.env.SHINE_AUTH_SECRET || "";
const path = (uid: string) => `shine_secure/${uid}`;
const hash = (pin: string, salt: string) => scryptSync(`${pin}:${PEPPER()}`, salt, 64, { N: 16384, r: 8, p: 1 }).toString("hex");
const validPin = (p: any) => typeof p === "string" && /^\d{4}$/.test(p);
const SESSION_MS = 30 * 60_000;
const pinToken = (uid: string, exp: number) => `${exp}.${createHmac("sha256", PEPPER()).update(`pin:${uid}:${exp}`).digest("base64url")}`;

export async function POST(req: NextRequest) {
  try {
    const { uid } = await requireUser(req.headers.get("authorization"));
    const b = await req.json().catch(() => ({}));
    const d: any = (await getDocData(path(uid))) || {};
    const now = Date.now();
    const lockedUntil = d.lockUntil ? new Date(d.lockUntil).getTime() : 0;
    const locked = lockedUntil > now;
    const status = () => ({ hasPin: !!d.pinHash, totpEnabled: !!d.totpEnabled, lockedUntil: locked ? new Date(lockedUntil).toISOString() : null,
      backupLeft: (d.backupHashes || []).length, wallet2fa: false, biometric: !!(d.bioEnabled && (d.passkeys || []).length), passkeys: (d.passkeys || []).map((k: any) => ({ id: String(k.id).slice(0, 12), name: k.name || "Passkey", at: k.at })) });
    // TOTP or a single-use backup code (consumed on success).
    const checkCode = async (code: any) => {
      if (locked) throw new HttpError(429, "Too many attempts. Please wait and try again.");
      const c = String(code || "").replace(/[\s-]/g, "").toUpperCase();
      if (/^\d{6}$/.test(c) && d.totpSecret && authenticator.check(c, d.totpSecret)) { await setFields(path(uid), { fails: 0, lockUntil: null }); return; }
      if (/^[A-Z0-9]{10}$/.test(c)) {
        const h = hash(c, "backup:" + uid);
        const list: string[] = d.backupHashes || [];
        if (list.includes(h)) { await setFields(path(uid), { backupHashes: list.filter((x) => x !== h), fails: 0, lockUntil: null }); return; }
      }
      await failAttempt("Invalid authenticator or backup code.");
    };
    const newBackups = async () => {
      const codes = Array.from({ length: 8 }, () => randomBytes(8).toString("base64").replace(/[^A-Za-z0-9]/g, "").toUpperCase().padEnd(10, "X").slice(0, 10));
      await setFields(path(uid), { backupHashes: codes.map((c) => hash(c, "backup:" + uid)) });
      return codes.map((c) => `${c.slice(0, 5)}-${c.slice(5)}`);
    };
    const signToken = () => { const exp = now + 5 * 60_000; return { signToken: `${exp}.${createHmac("sha256", PEPPER()).update(`sign:${uid}:${exp}`).digest("base64url")}`, expiresAt: exp }; };
    const failAttempt = async (msg: string) => {
      const fails = (d.fails || 0) + 1;
      const lock = fails >= 5 ? new Date(now + Math.min(60, 5 * 2 ** (fails - 5)) * 60_000) : null;
      await setFields(path(uid), { fails, lockUntil: lock });
      throw new HttpError(lock ? 429 : 401, lock ? `Too many attempts. Try again after ${lock.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" })} UTC.` : `${msg} ${5 - fails} attempt${5 - fails === 1 ? "" : "s"} left.`);
    };
    const checkPin = async (pin: string) => {
      if (locked) throw new HttpError(429, "Too many attempts. Please wait and try again.");
      if (!d.pinHash || !validPin(pin) || !timingSafeEqual(Buffer.from(hash(pin, d.pinSalt), "hex"), Buffer.from(d.pinHash, "hex"))) await failAttempt("Incorrect PIN.");
    };
    const setPin = async (pin: string) => {
      if (!validPin(pin)) throw new HttpError(400, "Your PIN must be 4 digits.");
      const salt = randomBytes(16).toString("hex");
      await setFields(path(uid), { pinHash: hash(pin, salt), pinSalt: salt, fails: 0, lockUntil: null, updatedAt: new Date() });
    };
    const session = () => { const exp = now + SESSION_MS; return { token: pinToken(uid, exp), expiresAt: exp }; };

    switch (b.action) {
      case "status": return json(status());
      case "set": if (d.pinHash) throw new HttpError(409, "A PIN is already set."); await setPin(b.pin); return json({ ok: true, ...session() });
      case "verify": await checkPin(b.pin); await setFields(path(uid), { fails: 0, lockUntil: null }); return json({ ok: true, ...session() });
      case "check": { const [exp, sig] = String(b.token || "").split("."); return json({ valid: Number(exp) > now && pinToken(uid, Number(exp)) === `${exp}.${sig}` }); }
      case "change": await checkPin(b.pin); await setPin(b.newPin); return json({ ok: true, ...session() });
      case "remove": await checkPin(b.pin); await setFields(path(uid), { pinHash: null, pinSalt: null, fails: 0, lockUntil: null }); return json({ ok: true });
      case "totp_setup": {
        if (d.totpEnabled) throw new HttpError(409, "Google Authenticator is already set up.");
        const secret = authenticator.generateSecret(20);
        await setFields(path(uid), { totpPending: secret });
        const label = String(b.label || "Shine account").replace(/[^A-Za-z0-9_@. -]/g, "").slice(0, 40) || "Shine account";
        return json({ otpauth: authenticator.keyuri(label, "Shine", secret), secret });
      }
      case "totp_verify": {
        if (!d.totpPending) throw new HttpError(409, "Start the Google Authenticator setup first.");
        if (!authenticator.check(String(b.code || ""), d.totpPending)) throw new HttpError(401, "That code didn't match. Check the time on your phone and try again.");
        await setFields(path(uid), { totpSecret: d.totpPending, totpPending: null, totpEnabled: true, totpAt: new Date() });
        return json({ ok: true, backupCodes: await newBackups() });
      }
      case "reset": {
        if (!d.totpEnabled) throw new HttpError(409, "Set up Google Authenticator first — it's required to reset your PIN.");
        if (locked) throw new HttpError(429, "Too many attempts. Please wait and try again.");
        await checkCode(b.code);
        await setPin(b.newPin);
        return json({ ok: true, ...session() });
      }
      case "totp_disable": {
        if (!d.totpEnabled) throw new HttpError(409, "Google Authenticator isn't enabled.");
        await checkCode(b.code);
        await setFields(path(uid), { totpEnabled: false, totpSecret: null, backupHashes: [], wallet2fa: false });
        return json({ ok: true });
      }
      case "backup_regen": { await checkCode(b.code); return json({ backupCodes: await newBackups() }); }
      case "wallet2fa": {
        // Transactions no longer use TOTP (biometric passkey only). Always off.
        await setFields(path(uid), { wallet2fa: false });
        return json({ ok: true, wallet2fa: false });
      }
      case "sign_gate": {
        // Wallet 2FA: verify a code before the client is allowed to sign/send.
        // Transactions never require a 2FA code; Google Authenticator is only for PIN recovery/account security.
        return json({ ok: true, required: false, ...signToken() });
      }
      default: throw new HttpError(400, "Unknown action.");
    }
  } catch (e) { return fail(e); }
}
