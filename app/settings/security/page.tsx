"use client";
import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { useApi } from "@/lib/client-api";
import { useSession } from "@/components/providers";
import { SessionGate } from "@/components/gate";
import { BackLink, Button, FullLoader } from "@/components/ui";
import { BottomSheet } from "@/components/bottom-sheet";
import { PinPad, pinSession } from "@/components/pin";
import { Row, Section, SI } from "@/components/settings-ui";
import { useToast } from "@/components/toast";
import { Toggle } from "@/components/settings-ui";
import { invalidateSecurity } from "@/components/confirm";
import { startRegistration } from "@simplewebauthn/browser";

type St = { hasPin: boolean; totpEnabled: boolean; backupLeft?: number; wallet2fa?: boolean; biometric?: boolean; passkeys?: { id: string; name: string; at: string }[] };

const DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === "1";
type Flow = null | { kind: "set" | "change" | "remove"; step: "old" | "new" | "confirm"; old?: string; next?: string };

function Inner() {
  const api = useApi();
  const toast = useToast();
  const { profile } = useSession();
  const [st, setSt] = useState<St | null>(null);
  const [flow, setFlow] = useState<Flow>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [totp, setTotp] = useState<{ qr: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  const load = useCallback(() => {
    if (DEMO) { setSt({ hasPin: true, totpEnabled: false }); return; }
    api<St>("/api/pin", { action: "status" }).then(setSt).catch((e) => { toast(e.message, "err"); setSt({ hasPin: false, totpEnabled: false }); });
  }, [api, toast]);
  useEffect(() => { load(); }, [load]);
  const [backup, setBackup] = useState<string[] | null>(null);
  const [prompt, setPrompt] = useState<null | { title: string; sub: string; run: (code: string) => Promise<any> }>(null);
  const [pcode, setPcode] = useState("");
  const [perr, setPerr] = useState<string | null>(null);
  const submitPrompt = async () => {
    if (!prompt) return;
    setBusy(true); setPerr(null);
    try { await prompt.run(pcode); setPrompt(null); setPcode(""); invalidateSecurity(); load(); } catch (e: any) { setPerr(e.message); }
    setBusy(false);
  };
  const ask = (title: string, sub: string, run: (code: string) => Promise<any>) => { setPerr(null); setPcode(""); setPrompt({ title, sub, run }); };
  const bioSupported = typeof window !== "undefined" && !!window.PublicKeyCredential;
  const registerBio = async () => {
    setBusy(true);
    try {
      const optionsJSON = await api("/api/webauthn", { action: "reg_options", label: profile?.username ? `@${profile.username}` : "Shine account" });
      const response = await startRegistration({ optionsJSON });
      const ua = navigator.userAgent;
      const name = /iPhone|iPad/.test(ua) ? "iPhone / iPad" : /Android/.test(ua) ? "Android device" : /Mac/.test(ua) ? "Mac" : /Windows/.test(ua) ? "Windows Hello" : "This device";
      await api("/api/webauthn", { action: "reg_verify", response, name });
      toast("Fingerprint / Face ID enabled for signing", "ok"); invalidateSecurity(); load();
    } catch (e: any) { toast(e?.name === "NotAllowedError" ? "Setup was cancelled" : e?.name === "InvalidStateError" ? "This device is already registered" : e.message, "err"); }
    setBusy(false);
  };
  const toggleBio = async (on: boolean) => {
    if (on && !st?.passkeys?.length) return registerBio();
    try { await api("/api/webauthn", { action: "toggle", enabled: on }); invalidateSecurity(); load(); toast(on ? "Biometric signing on" : "Biometric signing off", "ok"); } catch (e: any) { toast(e.message, "err"); }
  };
  useEffect(() => { if (DEMO && new URLSearchParams(location.search).get("totp")) startTotp(); }, []); // eslint-disable-line

  const onPin = async (pin: string) => {
    if (!flow) return;
    setErr(null);
    if (flow.step === "old") { if (flow.kind === "remove") return run(() => api("/api/pin", { action: "remove", pin }), "PIN removed"); setFlow({ ...flow, step: "new", old: pin }); return; }
    if (flow.step === "new") { setFlow({ ...flow, step: "confirm", next: pin }); return; }
    if (pin !== flow.next) { setErr("PINs don't match. Try again."); setFlow({ ...flow, step: "new", next: undefined }); return; }
    run(() => flow.kind === "set" ? api("/api/pin", { action: "set", pin }) : api("/api/pin", { action: "change", pin: flow.old, newPin: pin }), flow.kind === "set" ? "Chat PIN enabled" : "PIN changed");
  };
  const run = async (fn: () => Promise<any>, ok: string) => {
    setBusy(true);
    try { const r = await fn(); if (r?.token) pinSession.set(r); else pinSession.clear(); toast(ok, "ok"); setFlow(null); load(); }
    catch (e: any) { setErr(e.message); if (flow?.kind === "change") setFlow({ ...flow!, step: "old" }); }
    setBusy(false);
  };
  const startTotp = async () => {
    setBusy(true);
    try {
      const r = DEMO ? { otpauth: "otpauth://totp/Shine:ShineDemo?secret=JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP&issuer=Shine", secret: "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP" } : await api<{ otpauth: string; secret: string }>("/api/pin", { action: "totp_setup", label: profile?.username ? `@${profile.username}` : "Shine account" });
      setTotp({ qr: r.otpauth, secret: r.secret });
    } catch (e: any) { toast(e.message, "err"); }
    setBusy(false);
  };
  const verifyTotp = async () => {
    setBusy(true);
    try { const r = await api<{ backupCodes: string[] }>("/api/pin", { action: "totp_verify", code }); toast("Google Authenticator is set up", "ok"); setTotp(null); setCode(""); setBackup(r.backupCodes || null); load(); } catch (e: any) { toast(e.message, "err"); }
    setBusy(false);
  };
  if (!st) return <FullLoader />;
  const title = !flow ? "" : flow.step === "old" ? "Enter current PIN" : flow.step === "new" ? (flow.kind === "set" ? "Create a 4-digit PIN" : "Enter new PIN") : "Confirm your PIN";
  return (
    <div className="mx-auto max-w-2xl">
      <BackLink href="/settings" label="Settings" />
      <h1 className="mb-1 font-display text-3xl font-bold">Security</h1>
      <p className="mb-5 text-sm text-white/55">Lock your conversations behind a PIN. Your PIN is hashed with a per-account salt on Shine's servers and attempts are rate-limited.</p>
      <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className={`glass mb-5 flex items-center gap-4 rounded-3xl p-4 ${st.hasPin ? "neon" : ""}`}>
        <motion.span animate={st.hasPin ? { rotate: [0, -8, 8, 0] } : {}} transition={{ repeat: 0, duration: 3, repeatDelay: 2 }} className={`grid h-12 w-12 place-items-center rounded-2xl ring-1 ${st.hasPin ? "icon-grad neu-sm text-pink ring-pink/40" : "bg-white/5 text-white/50 ring-white/15"}`}>{SI.lock}</motion.span>
        <div className="flex-1"><p className="font-semibold">{st.hasPin ? "Chat PIN is on" : "Chat PIN is off"}</p><p className="text-xs text-white/50">{st.hasPin ? "Chat asks for your PIN each session." : "Anyone with your unlocked device can open your chats."}</p></div>
      </motion.div>
      <Section title="PIN">
        {!st.hasPin ? <Row icon={SI.lock} title="Set up chat PIN" sub="Require a 4-digit PIN to open Chat" onClick={() => { setErr(null); setFlow({ kind: "set", step: "new" }); }} /> : (<>
          <Row icon={SI.lock} title="Change PIN" onClick={() => { setErr(null); setFlow({ kind: "change", step: "old" }); }} />
          <Row icon={SI.out} danger title="Turn off PIN" onClick={() => { setErr(null); setFlow({ kind: "remove", step: "old" }); }} />
        </>)}
      </Section>
      <Section title="Two-factor authentication (2FA)">
        <Row icon={SI.shield} title="Google Authenticator" sub={st.totpEnabled ? "Enabled · used for Chat PIN recovery and account security" : "Required to reset a forgotten Chat PIN. Not used for transactions."}
          right={st.totpEnabled ? <Button size="sm" variant="glass" onClick={() => ask("Disable Google Authenticator", "Enter a current code or a backup code.", (c) => api("/api/pin", { action: "totp_disable", code: c }).then(() => toast("Google Authenticator disabled", "ok")))}>Disable</Button> : <Button size="sm" loading={busy && !flow && !prompt} onClick={startTotp}>Set up</Button>} />
        {st.totpEnabled && <Row icon={SI.list} title="Backup codes" sub={`${st.backupLeft ?? 0} unused · each works once if you lose your phone`}
          right={<Button size="sm" variant="glass" onClick={() => ask("New backup codes", "Enter a code from Google Authenticator. Old backup codes stop working.", (c) => api<{ backupCodes: string[] }>("/api/pin", { action: "backup_regen", code: c }).then((r) => setBackup(r.backupCodes)))}>Regenerate</Button>} />}
        <Row icon={SI.eye} title="Require fingerprint / Face ID to sign" sub={!bioSupported ? "Not supported on this browser" : st.biometric ? "On · a fingerprint / Face ID check alone confirms every send and signature" : "Uses your device's passkey (WebAuthn)"}
          right={<Toggle label="Biometric signing" on={!!st.biometric} onChange={(v) => bioSupported ? toggleBio(v) : toast("Passkeys aren't supported on this browser", "err")} />} />
        {(st.passkeys || []).map((k) => (
          <Row key={k.id} icon={SI.lock} title={k.name} sub={`Passkey · added ${new Date(k.at).toLocaleDateString()}`}
            right={<button type="button" className="text-xs text-red-300 hover:underline" onClick={() => api("/api/webauthn", { action: "remove", id: k.id }).then(() => { invalidateSecurity(); load(); toast("Passkey removed", "ok"); }).catch((e) => toast(e.message, "err"))}>Remove</button>} />
        ))}
        {!!st.passkeys?.length && bioSupported && <Row icon={SI.eye} title="Add another device" onClick={registerBio} />}
      </Section>

      <BottomSheet open={!!flow} onClose={() => !busy && setFlow(null)}>
        {flow && <div className="pb-4"><PinPad key={flow.step} title={title} onComplete={onPin} error={err} busy={busy} /></div>}
      </BottomSheet>
      <BottomSheet open={!!totp} onClose={() => setTotp(null)} title="Set up Google Authenticator">
        {totp && (
          <div className="space-y-4 pb-4">
            <ol className="space-y-1 text-sm text-white/65"><li>1. Open Google Authenticator and tap <b className="text-white">+</b></li><li>2. Scan this QR code (or enter the key)</li><li>3. Enter the 6-digit code to confirm</li></ol>
            <div className="mx-auto w-fit rounded-3xl bg-white p-3 shadow-[var(--raise-sm)]"><QRCodeSVG value={totp.qr} size={192} level="M" aria-label="Authenticator QR code" /></div>
            <button className="mx-auto block break-all rounded-xl bg-white/[.05] px-3 py-2 text-center font-mono text-xs text-white/70" onClick={() => { navigator.clipboard.writeText(totp.secret); toast("Setup key copied", "ok"); }}>{totp.secret.match(/.{1,4}/g)?.join(" ")}</button>
            <p className="text-center text-[11px] text-white/40">Tap the key to copy it for manual entry (time-based, 6 digits)</p>
            <input className="input text-center font-mono !text-2xl tracking-[0.5em]" inputMode="numeric" maxLength={6} placeholder="000000" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} />
            <Button className="w-full" loading={busy} disabled={code.length !== 6} onClick={verifyTotp}>Verify & enable</Button>
          </div>
        )}
      </BottomSheet>
      <BottomSheet open={!!prompt} onClose={() => !busy && setPrompt(null)} title={prompt?.title}>
        {prompt && (
          <div className="space-y-3 pb-4">
            <p className="text-sm text-white/60">{prompt.sub}</p>
            <input autoFocus className="input text-center font-mono !text-2xl tracking-[0.4em]" autoComplete="one-time-code" maxLength={11} placeholder="000000" value={pcode} onChange={(e) => setPcode(e.target.value.toUpperCase())} onKeyDown={(e) => e.key === "Enter" && submitPrompt()} />
            {perr && <p className="text-center text-sm text-red-300">{perr}</p>}
            <Button className="w-full" loading={busy} disabled={pcode.replace(/[-\s]/g, "").length < 6} onClick={submitPrompt}>Confirm</Button>
          </div>
        )}
      </BottomSheet>
      <BottomSheet open={!!backup} onClose={() => setBackup(null)} title="Save your backup codes">
        {backup && (
          <div className="space-y-4 pb-4">
            <p className="text-sm text-white/60">Each code works once if you lose access to Google Authenticator. Store them somewhere safe — they won&apos;t be shown again.</p>
            <div className="grid grid-cols-2 gap-2">{backup.map((c, i) => <motion.code key={c} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="rounded-xl bg-white/[.05] py-2 text-center font-mono text-sm tracking-wider ring-1 ring-white/10">{c}</motion.code>)}</div>
            <div className="flex gap-2">
              <Button variant="glass" className="flex-1" onClick={() => { navigator.clipboard.writeText(backup.join("\n")); toast("Backup codes copied", "ok"); }}>Copy</Button>
              <Button variant="glass" className="flex-1" onClick={() => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([`Shine backup codes\n\n${backup.join("\n")}\n`], { type: "text/plain" })); a.download = "shine-backup-codes.txt"; a.click(); }}>Download</Button>
            </div>
            <Button className="w-full" onClick={() => setBackup(null)}>I&apos;ve saved them</Button>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
export default function SecurityPage() { return <SessionGate allowDeactivated text="Sign in to manage security."><Inner /></SessionGate>; }
