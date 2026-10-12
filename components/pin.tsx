"use client";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useAnimationControls } from "framer-motion";
import { useApi } from "@/lib/client-api";
import { useSession } from "./providers";
import { Button } from "./ui";
import { BottomSheet } from "./bottom-sheet";
import { useToast } from "./toast";
import { ICON } from "./icons";

const KEY = "shine.pin";
const DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === "1";
export const pinSession = {
  get: () => { try { const v = JSON.parse(sessionStorage.getItem(KEY) || "null"); return v && v.expiresAt > Date.now() ? v : null; } catch { return null; } },
  set: (v: { token: string; expiresAt: number }) => sessionStorage.setItem(KEY, JSON.stringify(v)),
  clear: () => sessionStorage.removeItem(KEY),
};

/** 4-dot PIN entry with an animated keypad. */
export function PinPad({ onComplete, error, busy, title, sub }: { onComplete: (pin: string) => void; error?: string | null; busy?: boolean; title: string; sub?: ReactNode }) {
  const [pin, setPin] = useState("");
  const shake = useAnimationControls();
  useEffect(() => { if (error) { shake.start({ x: [0, -12, 12, -8, 8, 0], transition: { duration: 0.4 } }); setPin(""); } }, [error, shake]);
  const press = useCallback((d: string) => {
    if (busy) return;
    setPin((p) => { const n = (p + d).slice(0, 4); if (n.length === 4) setTimeout(() => onComplete(n), 120); return n; });
  }, [busy, onComplete]);
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (/^\d$/.test(e.key)) press(e.key); if (e.key === "Backspace") setPin((p) => p.slice(0, -1)); };
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h);
  }, [press]);
  return (
    <div className="flex flex-col items-center">
      <motion.div className="relative mb-4 grid h-16 w-16 place-items-center" animate={{ rotate: busy ? 360 : 0 }} transition={busy ? { repeat: Infinity, duration: 1.2, ease: "linear" } : {}}>
        <motion.span className="absolute inset-0 rounded-full bg-pink/30 blur-xl" animate={{ scale: [1, 1.25, 1] }} transition={{ repeat: Infinity, duration: 2.2 }} />
        <img src="/brand/star-192.png" alt="" className="relative h-14 w-14" />
      </motion.div>
      <h2 className="font-display text-2xl font-semibold">{title}</h2>
      {sub && <p className="mt-1 max-w-xs text-center text-sm text-white/55">{sub}</p>}
      <motion.div animate={shake} className="my-6 flex gap-4">
        {[0, 1, 2, 3].map((i) => (
          <motion.span key={i} animate={{ scale: pin.length > i ? 1.15 : 1 }} className={`h-4 w-4 rounded-full border-2 ${pin.length > i ? "border-pink bg-pink shadow-[0_0_14px_#ff2fa6]" : "border-white/30"}`} />
        ))}
      </motion.div>
      <p className="mb-3 h-5 text-sm text-red-300">{error || ""}</p>
      <div className="grid grid-cols-3 gap-3">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"].map((k, i) => k === "" ? <span key={i} /> : (
          <motion.button key={i} type="button" whileTap={{ scale: 0.88 }} onClick={() => (k === "⌫" ? setPin((p) => p.slice(0, -1)) : press(k))}
            className="glass grid h-16 w-16 place-items-center rounded-full text-2xl font-semibold transition hover:border-pink/40 sm:h-[70px] sm:w-[70px]" aria-label={k === "⌫" ? "Delete" : k}>{k}</motion.button>
        ))}
      </div>
    </div>
  );
}

/** Locks the Chat section behind the user's PIN (if they set one). */
export function ChatLock({ children }: { children: ReactNode }) {
  const { fbReady, authenticated } = useSession();
  const api = useApi();
  const toast = useToast();
  const [state, setState] = useState<"checking" | "open" | "locked">("checking");
  const [info, setInfo] = useState<{ hasPin: boolean; totpEnabled: boolean } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [forgot, setForgot] = useState(false);
  const [code, setCode] = useState("");
  const [newPin, setNewPin] = useState("");
  useEffect(() => {
    if (DEMO && new URLSearchParams(location.search).get("pin")) { setInfo({ hasPin: true, totpEnabled: true }); setState("locked"); return; }
    if (!authenticated || !fbReady) { setState("open"); return; }
    if (pinSession.get()) { setState("open"); return; }
    api<{ hasPin: boolean; totpEnabled: boolean }>("/api/pin", { action: "status" }).then((s) => { setInfo(s); setState(s.hasPin ? "locked" : "open"); }).catch(() => setState("open"));
  }, [authenticated, fbReady, api]);
  const verify = async (pin: string) => {
    setBusy(true); setErr(null);
    try { const r = await api<{ token: string; expiresAt: number }>("/api/pin", { action: "verify", pin }); pinSession.set(r); setState("open"); }
    catch (e: any) { setErr(e.message); }
    setBusy(false);
  };
  const reset = async () => {
    setBusy(true);
    try { const r = await api<{ token: string; expiresAt: number }>("/api/pin", { action: "reset", code, newPin }); pinSession.set(r); setForgot(false); setState("open"); toast("Your chat PIN was reset", "ok"); }
    catch (e: any) { toast(e.message, "err"); }
    setBusy(false);
  };
  if (state === "checking") return <div className="grid min-h-[50vh] place-items-center text-white/40">{ICON.lock}</div>;
  if (state === "open") return <>{children}</>;
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mx-auto flex max-w-sm flex-col items-center pt-6">
      <PinPad title="Chat is locked" sub="Enter your 4-digit PIN to open your conversations." onComplete={verify} error={err} busy={busy} />
      <button className="mt-6 text-sm font-semibold text-pink hover:underline" onClick={() => setForgot(true)}>Forgot PIN?</button>
      <BottomSheet open={forgot} onClose={() => setForgot(false)} title="Reset your PIN">
        {info?.totpEnabled ? (
          <div className="space-y-3 pb-3">
            <p className="text-sm text-white/60">Enter the 6-digit code from Google Authenticator and choose a new PIN.</p>
            <input className="input text-center font-mono !text-2xl tracking-[0.5em]" inputMode="numeric" maxLength={6} placeholder="000000" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} />
            <input className="input text-center font-mono !text-xl tracking-[0.6em]" inputMode="numeric" type="password" maxLength={4} placeholder="New PIN" value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))} />
            <Button className="w-full" loading={busy} disabled={code.length !== 6 || newPin.length !== 4} onClick={reset}>Verify & reset PIN</Button>
          </div>
        ) : (
          <div className="space-y-3 pb-3">
            <div className="flex gap-3 rounded-2xl border border-amber-300/30 bg-amber-400/[.07] p-3.5 text-sm text-amber-100">{ICON.lock}<p>PIN reset requires Google Authenticator, which isn't set up on this account. Set it up in Settings → Chat security after unlocking, or contact Shine Support from Settings.</p></div>
            <Button variant="glass" className="w-full" onClick={() => setForgot(false)}>Got it</Button>
          </div>
        )}
      </BottomSheet>
    </motion.div>
  );
}
