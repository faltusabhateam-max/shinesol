"use client";
import { AnimatePresence, motion } from "framer-motion";
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
type T = { id: number; text: string; tone: "ok" | "err" | "info" };
const Ctx = createContext<(text: string, tone?: T["tone"]) => void>(() => {});
export const useToast = () => useContext(Ctx);
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<T[]>([]);
  const push = useCallback((text: string, tone: T["tone"] = "info") => {
    const id = Date.now() + Math.random();
    setItems((x) => [...x, { id, text, tone }]);
    setTimeout(() => setItems((x) => x.filter((i) => i.id !== id)), 3200);
  }, []);
  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-20 z-[80] flex flex-col items-center gap-2 px-4">
        <AnimatePresence>
          {items.map((t) => (
            <motion.div key={t.id} initial={{ opacity: 0, y: -16, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.96 }}
              className={`glass pointer-events-auto rounded-2xl px-4 py-3 text-sm font-medium shadow-xl ${t.tone === "err" ? "border-red-500/40 text-red-200" : t.tone === "ok" ? "border-pink-400/40 text-white" : "text-white/90"}`}>
              {t.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  );
}
