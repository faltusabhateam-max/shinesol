"use client";
import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode } from "react";

/** Shine bottom sheet: slides up from the bottom and covers ~40% of the screen (grows with content). */
export function BottomSheet({ open, onClose, children, title, dismissable = true }: { open: boolean; onClose: () => void; children: ReactNode; title?: string; dismissable?: boolean }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[85] flex items-end justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div className="absolute inset-0 bg-black/65 backdrop-blur-[6px]" onClick={() => dismissable && onClose()} />
          <motion.div
            role="dialog" aria-modal="true" aria-label={title}
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", stiffness: 300, damping: 32 }}
            drag={dismissable ? "y" : false} dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, i) => { if (dismissable && (i.offset.y > 120 || i.velocity.y > 600)) onClose(); }}
            className="glass-strong safe-bottom relative flex max-h-[88vh] min-h-[40vh] w-full max-w-lg flex-col overflow-y-auto rounded-t-[2rem] border-b-0 px-5 pt-3 shadow-[0_-20px_60px_-20px_rgba(255,47,166,.45)]">
            <div className="mx-auto mb-3 h-1.5 w-12 shrink-0 rounded-full bg-white/20" />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-pink/70 to-transparent" />
            {title && <h3 className="mb-3 text-center font-display text-lg font-semibold">{title}</h3>}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
