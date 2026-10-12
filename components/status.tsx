"use client";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "./ui";
import type { ReactNode } from "react";

export type StatusKind = "success" | "failed" | "denied";

/** Full-screen animated outcome overlay: success / failed / denied. */
export function StatusOverlay({ kind, title, message, onClose, action }: { kind: StatusKind | null; title?: string; message?: ReactNode; onClose: () => void; action?: ReactNode }) {
  const color = kind === "success" ? "#ff2fa6" : kind === "denied" ? "#f5b942" : "#ff5470";
  return (
    <AnimatePresence>
      {kind && (
        <motion.div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 px-6 backdrop-blur-md" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div initial={{ scale: 0.85, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0 }} transition={{ type: "spring", stiffness: 260, damping: 22 }}
            className="glass-strong w-full max-w-sm rounded-[2rem] p-8 text-center">
            <div className="relative mx-auto mb-6 h-32 w-32">
              {[0, 1, 2].map((i) => (
                <motion.span key={i} className="absolute inset-0 rounded-full border-2" style={{ borderColor: color }}
                  initial={{ scale: 0.6, opacity: 0.8 }} animate={{ scale: 1.7, opacity: 0 }} transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.6, ease: "easeOut" }} />
              ))}
              <motion.div className="absolute inset-0 rounded-full" style={{ background: `radial-gradient(circle, ${color}55, transparent 70%)` }} animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 2, repeat: Infinity }} />
              <svg viewBox="0 0 120 120" className="absolute inset-0">
                <motion.circle cx="60" cy="60" r="44" fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
                  initial={{ pathLength: 0, rotate: -90 }} animate={{ pathLength: 1 }} transition={{ duration: 0.7, ease: "easeOut" }} style={{ filter: `drop-shadow(0 0 10px ${color})` }} />
                {kind === "success" && (
                  <motion.path d="M40 62 L54 76 L82 46" fill="none" stroke="#fff" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"
                    initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.55, duration: 0.45, ease: "easeOut" }} />
                )}
                {kind === "failed" && (
                  <>
                    <motion.path d="M44 44 L76 76" stroke="#fff" strokeWidth="7" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.55, duration: 0.3 }} />
                    <motion.path d="M76 44 L44 76" stroke="#fff" strokeWidth="7" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.8, duration: 0.3 }} />
                  </>
                )}
                {kind === "denied" && (
                  <>
                    <motion.path d="M60 38 L60 66" stroke="#fff" strokeWidth="7" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.55, duration: 0.35 }} />
                    <motion.circle cx="60" cy="80" r="4.5" fill="#fff" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.9, type: "spring" }} />
                  </>
                )}
              </svg>
              {kind === "success" && [...Array(10)].map((_, i) => (
                <motion.img key={i} src="/brand/star-64.png" alt="" className="absolute left-1/2 top-1/2 h-4 w-4"
                  initial={{ x: -8, y: -8, scale: 0, opacity: 1 }}
                  animate={{ x: Math.cos((i / 10) * Math.PI * 2) * 90 - 8, y: Math.sin((i / 10) * Math.PI * 2) * 90 - 8, scale: [0, 1, 0.4], opacity: [1, 1, 0], rotate: 180 }}
                  transition={{ delay: 0.6, duration: 1.1, ease: "easeOut" }} />
              ))}
            </div>
            <motion.h3 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="font-display text-2xl font-semibold">
              {title || (kind === "success" ? "Success" : kind === "denied" ? "Request declined" : "Something went wrong")}
            </motion.h3>
            {message && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.65 }} className="mt-2 text-sm text-white/65">{message}</motion.div>}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="mt-6 flex flex-col gap-2">
              {action}
              <Button variant={kind === "success" ? "pink" : "glass"} onClick={onClose} className="w-full">{kind === "success" ? "Continue" : "Close"}</Button>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function errorKind(e: any): StatusKind {
  const m = String(e?.message || e || "").toLowerCase();
  return /user rejected|rejected the request|denied|declin|cancel|user exited|exited|closed by user/.test(m) ? "denied" : "failed";
}
export function friendlyError(e: any) {
  const m = String(e?.message || e || "");
  if (e?.name === "TxError" || e?.code && ["insufficient", "rent", "min", "simulation", "send", "onchain", "expired", "timeout", "rpc"].includes(e.code)) return m;
  if (errorKind(e) === "denied") return "You cancelled the request. No funds were moved.";
  if (/cannot destructure|undefined|reading '/i.test(m)) return "The network didn't return a confirmation in time. Check your wallet history before retrying.";
  if (/insufficient funds for rent|rent/i.test(m)) return "This would leave your wallet below Solana's rent-exempt minimum (0.00089 SOL).";
  if (/insufficient|0x1\b|custom program error: 0x1/i.test(m)) return "Insufficient SOL balance to cover this amount plus network fees.";
  if (/invalid public key|invalid address|non-base58|Invalid character/i.test(m)) return "That isn't a valid Solana address.";
  if (/blockhash not found|block height exceeded|expired/i.test(m)) return "The transaction expired before it was confirmed. No funds were moved. Please try again.";
  if (/429|too many|rate limit|failed to fetch|network|unavailable|timeout/i.test(m)) return "The Solana network is busy right now. Please try again in a moment.";
  if (/simulation failed/i.test(m)) return "The network rejected this transaction. Check the amount and your balance.";
  if (/permission|insufficient permissions/i.test(m)) return "You don't have permission to perform this action.";
  return m.length > 160 ? m.slice(0, 160) + "…" : m || "Please try again.";
}
