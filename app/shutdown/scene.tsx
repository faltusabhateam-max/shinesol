"use client";
import { motion, useReducedMotion } from "framer-motion";

const PARTICLES = Array.from({ length: 26 }, (_, i) => ({
  left: (i * 37 + 11) % 100,
  size: 2 + ((i * 7) % 4),
  delay: (i * 0.73) % 9,
  dur: 11 + ((i * 5) % 9),
  drift: ((i % 5) - 2) * 14,
  hue: ["#ff5e8a", "#ff8a5c", "#8e44ad", "#ffa3b8"][i % 4],
}));

export default function ShutdownScene() {
  const still = useReducedMotion();
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-5 py-14 text-center">
      {/* fading gradient glow */}
      <motion.div aria-hidden className="pointer-events-none absolute left-1/2 top-[18%] h-[26rem] w-[26rem] -translate-x-1/2 rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(255,94,138,.45), rgba(255,138,92,.22) 45%, rgba(142,68,173,.12) 70%, transparent 75%)" }}
        initial={{ opacity: 0.9, scale: 1.05 }}
        animate={still ? { opacity: 0.35 } : { opacity: [0.9, 0.5, 0.35, 0.22], scale: [1.05, 1, 0.96, 0.92] }}
        transition={{ duration: 9, ease: "easeOut" }} />
      {/* light particles drifting down */}
      {!still && (
        <div aria-hidden className="pointer-events-none absolute inset-0">
          {PARTICLES.map((p, i) => (
            <motion.span key={i} className="absolute top-0 rounded-full"
              style={{ left: `${p.left}%`, width: p.size, height: p.size, background: p.hue, boxShadow: `0 0 ${p.size * 3}px ${p.hue}` }}
              initial={{ y: "-5vh", opacity: 0 }}
              animate={{ y: "105vh", x: [0, p.drift, 0], opacity: [0, 0.8, 0.5, 0] }}
              transition={{ duration: p.dur, delay: p.delay, repeat: Infinity, ease: "linear" }} />
          ))}
        </div>
      )}

      <div className="relative z-10 flex w-full max-w-xl flex-col items-center">
        {/* logo dimming / flickering out */}
        <div className="neu relative mb-8 grid h-28 w-28 place-items-center rounded-full sm:h-32 sm:w-32">
          <motion.img src="/brand/star.png" alt="Shine logo" className="h-16 w-16 sm:h-20 sm:w-20"
            initial={{ opacity: 1, filter: "grayscale(0) brightness(1.1) drop-shadow(0 0 18px rgba(255,94,138,.7))" }}
            animate={still ? { opacity: 0.4, filter: "grayscale(0.85) brightness(0.7) drop-shadow(0 0 0px rgba(255,94,138,0))" } : {
              opacity: [1, 0.55, 0.95, 0.35, 0.8, 0.4, 0.45, 0.32],
              filter: [
                "grayscale(0) brightness(1.1) drop-shadow(0 0 18px rgba(255,94,138,.7))",
                "grayscale(0.2) brightness(0.8) drop-shadow(0 0 8px rgba(255,94,138,.4))",
                "grayscale(0.2) brightness(1) drop-shadow(0 0 14px rgba(255,94,138,.6))",
                "grayscale(0.5) brightness(0.6) drop-shadow(0 0 4px rgba(255,94,138,.2))",
                "grayscale(0.5) brightness(0.9) drop-shadow(0 0 10px rgba(255,94,138,.4))",
                "grayscale(0.7) brightness(0.65) drop-shadow(0 0 3px rgba(255,94,138,.15))",
                "grayscale(0.8) brightness(0.7) drop-shadow(0 0 2px rgba(255,94,138,.1))",
                "grayscale(0.85) brightness(0.65) drop-shadow(0 0 0px rgba(255,94,138,0))",
              ],
            }}
            transition={{ duration: 7, ease: "easeInOut", times: [0, 0.12, 0.2, 0.38, 0.45, 0.66, 0.8, 1] }} />
        </div>

        <motion.h1 className="font-display text-[1.7rem] font-extrabold leading-tight sm:text-4xl"
          initial={still ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.6, delay: 0.6 }}>
          <span className="grad-text">Shine</span> has permanently shut down
        </motion.h1>

        <motion.p className="mt-5 text-[0.95rem] leading-relaxed text-white/70 sm:text-base"
          initial={still ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 2, delay: 1.4 }}>
          Due to lack of funding, we&apos;ve made the difficult decision to permanently shut down Shine.
          Thank you to every creator and project who believed in us — it was an honour to build this with you.
        </motion.p>

        <motion.div role="alert" className="neu mt-9 w-full rounded-3xl p-5 text-left sm:p-6"
          style={{ border: "1px solid rgba(255,94,138,.45)" }}
          initial={still ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.4, delay: 2.2 }}>
          <div className="flex items-start gap-3">
            <svg viewBox="0 0 24 24" className="mt-0.5 h-6 w-6 shrink-0" fill="none" stroke="#ff5e8a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /><path d="M12 9v4M12 17h.01" />
            </svg>
            <div className="text-[0.9rem] leading-relaxed text-white/85 sm:text-[0.95rem]">
              <p className="font-display font-bold text-[#ff8fab]">Security warning: Shine is no longer operating.</p>
              <p className="mt-2">
                Anyone who DMs you or shares a link claiming to be Shine — offering payouts, airdrops, refunds, wallet recovery or claims — <strong className="text-white">is a scam</strong>.
                Do not click those links, and <strong className="text-white">never share your private key or seed phrase</strong>.
              </p>
            </div>
          </div>
        </motion.div>

        <footer className="mt-12 text-xs tracking-wide text-white/40">© Shine — 2026</footer>
      </div>
    </main>
  );
}
