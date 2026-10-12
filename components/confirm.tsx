"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { BottomSheet } from "./bottom-sheet";
import { Button } from "./ui";
import { usePrivy } from "@privy-io/react-auth";
import { startAuthentication } from "@simplewebauthn/browser";

type Sec = { wallet2fa: boolean; biometric: boolean; at: number };
let secCache: Sec | null = null;
/** Call after changing security settings so the next confirm re-reads them. */
export const invalidateSecurity = () => { secCache = null; };

export type ConfirmOptions = {
  kind: "sign" | "transaction";
  title: string;
  subtitle?: string;
  amount?: string;
  amountSub?: string;
  rows?: [string, ReactNode][];
  message?: string; // message to be signed (shown in a scroll box)
  warning?: string;
  confirmLabel?: string;
};
const Ctx = createContext<(o: ConfirmOptions) => Promise<boolean>>(async () => false);
export const useConfirm = () => useContext(Ctx);
export class UserRejectedError extends Error { constructor() { super("User rejected the request."); } }

/** Shine's own signature / transaction approval sheet. Privy's wallet UI is disabled (showWalletUIs: false). */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((v: boolean) => void) | null>(null);
  const confirm = useCallback((o: ConfirmOptions) => new Promise<boolean>((res) => { resolver.current = res; setOpts(o); }), []);
  const { getAccessToken, authenticated } = usePrivy();
  const [step, setStep] = useState<"review" | "code" | "bio">("review");
  const [code, setCode] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const finish = (v: boolean) => { resolver.current?.(v); resolver.current = null; setOpts(null); setStep("review"); setCode(""); setErr(null); setBusy(false); };
  const post = async (path: string, body: any) => {
    const t = await getAccessToken();
    const r = await fetch(path, { method: "POST", headers: { authorization: `Bearer ${t}`, "content-type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || "Verification failed.");
    return j;
  };
  const security = async (): Promise<Sec> => {
    if (secCache && Date.now() - secCache.at < 60_000) return secCache;
    if (process.env.NEXT_PUBLIC_DEMO_MODE === "1") return { wallet2fa: false, biometric: /bio=1/.test(location.search), at: Date.now() };
    if (!authenticated) return { wallet2fa: false, biometric: false, at: Date.now() };
    const j = await post("/api/pin", { action: "status" });
    return (secCache = { wallet2fa: false, biometric: !!j.biometric, at: Date.now() });
  };
  const runBio = async (sec: Sec) => {
    setBusy(true); setErr(null);
    try {
      const optionsJSON = await post("/api/webauthn", { action: "auth_options" });
      const response = await startAuthentication({ optionsJSON });
      await post("/api/webauthn", { action: "auth_verify", response });
      finish(true);
    } catch (e: any) { setErr(e?.name === "NotAllowedError" ? "Biometric check was cancelled." : e?.message || "Biometric check failed."); setBusy(false); }
  };
  const [bioOn, setBioOn] = useState(false);
  // Screenshot-only (demo builds): ?confirmdemo=1 opens a sample confirmation.
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_DEMO_MODE !== "1" || !/confirmdemo=1/.test(location.search)) return;
    const t = setTimeout(() => confirm({ kind: "transaction", title: "Send SOL", subtitle: "From your Shine Wallet", amount: "0.25 SOL", amountSub: "≈ $27.90", rows: [["To", "9xQe…sFin"], ["Shine fee (0.2%)", "0.0005 SOL"], ["Network fee", "~0.000005 SOL"], ["Total", "0.250505 SOL"]] }), 1500);
    return () => clearTimeout(t);
  }, [confirm]);
  useEffect(() => { if (opts) security().then((x) => setBioOn(x.biometric)).catch(() => setBioOn(false)); else setBioOn(false); }, [opts]); // eslint-disable-line
  const approve = async () => {
    setBusy(true); setErr(null);
    try {
      const sec = await security();
      if (sec.biometric) { setStep("bio"); return runBio(sec); }
      finish(true);
    } catch (e: any) { setErr(e?.message || "Couldn't check your security settings."); setBusy(false); }
  };
  const submitCode = async () => {
    setBusy(true); setErr(null);
    try { await post("/api/pin", { action: "sign_gate", code }); finish(true); }
    catch (e: any) { setErr(e?.message || "Invalid code."); setBusy(false); }
  };
  return (
    <Ctx.Provider value={confirm}>
      {children}
      <BottomSheet open={!!opts} onClose={() => finish(false)}>
        {opts && (
          <div className="flex flex-1 flex-col pb-2">
            <div className="flex items-center gap-3">
              <div className="relative h-12 w-12 shrink-0">
                <motion.span className="absolute inset-0 rounded-full bg-pink/30 blur-md" animate={{ scale: [1, 1.25, 1], opacity: [0.6, 1, 0.6] }} transition={{ repeat: Infinity, duration: 2 }} />
                <motion.img src="/brand/star-192.png" alt="" className="relative h-12 w-12" animate={{ rotate: [0, 12, 0] }} transition={{ repeat: Infinity, duration: 3 }} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-pink">{opts.kind === "sign" ? "Signature request" : "Confirm transaction"}</p>
                <h3 className="font-display text-xl font-semibold leading-tight">{opts.title}</h3>
                {opts.subtitle && <p className="text-sm text-white/55">{opts.subtitle}</p>}
              </div>
            </div>
            {opts.amount && (
              <div className="mt-4 text-center">
                <p className="font-display text-4xl font-semibold">{opts.amount}</p>
                {opts.amountSub && <p className="text-sm text-white/55">{opts.amountSub}</p>}
              </div>
            )}
            {opts.rows && opts.rows.length > 0 && (
              <div className="mt-4 rounded-2xl bg-white/[.04] px-4 py-2">
                {opts.rows.map(([l, v], i) => (
                  <div key={i} className={`flex items-center justify-between gap-3 py-2 text-sm ${i === opts.rows!.length - 1 && opts.kind === "transaction" ? "border-t border-white/10 font-semibold text-white" : "text-white/70"}`}>
                    <span>{l}</span><span className="min-w-0 truncate text-right">{v}</span>
                  </div>
                ))}
              </div>
            )}
            {opts.message && (
              <div className="mt-4">
                <p className="mb-1.5 text-xs font-semibold text-white/50">Message</p>
                <pre className="no-scrollbar max-h-36 overflow-y-auto whitespace-pre-wrap break-words rounded-2xl bg-black/40 p-3 font-mono text-[11.5px] leading-relaxed text-white/75">{opts.message}</pre>
              </div>
            )}
            {opts.warning && <p className="mt-3 rounded-2xl border border-amber-300/25 bg-amber-300/10 p-3 text-xs leading-relaxed text-amber-100/85">{opts.warning}</p>}
            {step === "code" && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-4 rounded-2xl bg-pink/[.06] p-4 ring-1 ring-pink/25">
                <p className="text-sm font-semibold">Two-factor authentication</p>
                <p className="mb-3 text-xs text-white/55">Enter the 6-digit code from Google Authenticator (or a backup code).</p>
                <input autoFocus inputMode="text" autoComplete="one-time-code" value={code} maxLength={11} onChange={(e) => setCode(e.target.value.toUpperCase())} onKeyDown={(e) => e.key === "Enter" && code.length >= 6 && submitCode()}
                  placeholder="000000" className="w-full rounded-xl bg-black/40 px-4 py-3 text-center font-mono text-2xl tracking-[.4em] outline-none ring-1 ring-white/10 focus:ring-pink/60" />
              </motion.div>
            )}
            {step === "bio" && !bioOn && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mt-4 flex items-center gap-3 rounded-2xl bg-pink/[.06] p-4 ring-1 ring-pink/25">
                <motion.svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#ff2fa6" strokeWidth="1.6" strokeLinecap="round" animate={{ opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 1.6 }}>
                  <path d="M12 11v3m-4-2a4 4 0 0 1 8 0v1.5M5 10a7 7 0 0 1 14 0v3M9 17c.6 1.5 1.2 2.6 2 3.5m4-6.5c0 2-.4 4-1.2 5.5" />
                </motion.svg>
                <div><p className="text-sm font-semibold">Confirm with fingerprint / Face ID</p><p className="text-xs text-white/55">Follow your device prompt.</p></div>
                {!busy && <Button size="sm" variant="glass" className="ml-auto" onClick={() => security().then(runBio)}>Retry</Button>}
              </motion.div>
            )}
            {err && <p className="mt-3 text-center text-sm text-red-300">{err}</p>}
            <div className="mt-auto flex gap-2 pt-5">
              <Button variant="glass" size="lg" className="flex-1" onClick={() => finish(false)}>Reject</Button>
              {step === "code"
                ? <Button size="lg" className="flex-[2]" loading={busy} disabled={code.replace(/[-\s]/g, "").length < 6} onClick={submitCode}>Verify & {opts.kind === "sign" ? "sign" : "send"}</Button>
                : bioOn ? (
                  <motion.button type="button" disabled={busy} onClick={approve} whileTap={{ scale: 0.96 }}
                    className="flex flex-[2] items-center justify-center gap-2.5 rounded-2xl bg-pink px-4 py-3.5 font-semibold text-white shadow-[0_0_28px_-6px_#ff2fa6] disabled:opacity-70">
                    <motion.svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" animate={busy ? { opacity: [0.4, 1, 0.4] } : { scale: [1, 1.08, 1] }} transition={{ repeat: Infinity, duration: busy ? 1 : 2 }}>
                      <path d="M12 11v3m-4-2a4 4 0 0 1 8 0v1.5M5 10a7 7 0 0 1 14 0v3M9 17c.6 1.5 1.2 2.6 2 3.5m4-6.5c0 2-.4 4-1.2 5.5" />
                    </motion.svg>
                    {busy ? "Waiting for fingerprint…" : "Confirm with fingerprint"}
                  </motion.button>
                ) : <Button size="lg" className="flex-[2]" loading={busy} onClick={approve}>{opts.confirmLabel || (opts.kind === "sign" ? "Sign" : "Confirm")}</Button>}
            </div>
            <p className="mt-3 text-center text-[11px] text-white/35">{bioOn ? "Fingerprint / Face ID required · " : ""}Secured by your Shine Wallet · Shine never holds your private key</p>
          </div>
        )}
      </BottomSheet>
    </Ctx.Provider>
  );
}
