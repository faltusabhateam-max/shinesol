"use client";
import { useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Avatar, Button } from "./ui";
import { IconTile, LIcon } from "./line-icons";
import { stepMeta } from "@/lib/steps";
import { useToast } from "./toast";
import { fileToDataUrl } from "@/lib/image";
import { answerKey, collects, normalizeUsername, validateAnswer, type ApplyStep } from "@/lib/steps";

type Props = { steps: ApplyStep[]; projectName: string; projectAvatar?: string; onClose: () => void; onSubmit: (answers: Record<string, string>) => Promise<void>; busy?: boolean; preview?: boolean };

/** Story-style applicant flow: one card at a time with progress, ending with the Shine wallet signature. */
export function StepFlow({ steps, projectName, projectAvatar, onClose, onSubmit, busy, preview }: Props) {
  const toast = useToast();
  const [i, setI] = useState(0);
  const [dir, setDir] = useState(1);
  const [ans, setAns] = useState<Record<string, string>>({});
  const [multi, setMulti] = useState<Record<string, string[]>>({});
  const [err, setErr] = useState<string | null>(null);
  const [opened, setOpened] = useState<Record<string, boolean>>({});
  const fileRef = useRef<HTMLInputElement>(null);
  const total = steps.length + 1; // + final signature card
  const s = steps[i];
  const isFinal = i >= steps.length;
  const val = s ? (s.type === "choice" && s.multi ? (multi[s.id] || []).join(", ") : ans[s.id] || "") : "";
  const go = (d: 1 | -1) => { setErr(null); setDir(d); setI((x) => Math.max(0, Math.min(steps.length, x + d))); };
  const next = () => {
    if (!s) return;
    if (s.type === "task" && !s.requiresLink && s.required && ans[s.id] !== "done") return setErr("Complete the task, then tap “I've done this”.");
    const e = s.type === "task" && !s.requiresLink ? null : collects(s) ? validateAnswer(s, val) : null;
    if (e) return setErr(e);
    go(1);
  };
  const set = (v: string) => { setErr(null); setAns((a) => ({ ...a, [s!.id]: v })); };
  const pickFile = async (f?: File) => {
    if (!f) return;
    try { const { dataUrl } = await fileToDataUrl(f, 900, 140_000); set(dataUrl); } catch { toast("Couldn't read that image", "err"); }
  };
  const final = async () => {
    const out: Record<string, string> = { kind: "steps" };
    for (const st of steps) {
      if (!collects(st)) continue;
      const v = st.type === "choice" && st.multi ? (multi[st.id] || []).join(", ") : ans[st.id] || "";
      if (v) out[answerKey(st)] = v.slice(0, st.type === "file" ? 150_000 : 2000);
    }
    await onSubmit(out);
  };
  const answered = useMemo(() => steps.filter((st) => collects(st) && (ans[st.id] || (multi[st.id] || []).length)).length, [steps, ans, multi]);

  const body = (
    <motion.div className="fixed inset-0 z-[90] flex flex-col bg-[#07030a]/95 backdrop-blur-xl" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div className="pointer-events-none absolute left-1/2 top-1/3 h-80 w-80 -translate-x-1/2 rounded-full bg-pink/20 blur-[100px]" animate={{ scale: [1, 1.15, 1] }} transition={{ repeat: Infinity, duration: 5 }} />
      <div className="relative mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="flex gap-1">{Array.from({ length: total }).map((_, k) => (
          <div key={k} className="h-1 flex-1 overflow-hidden rounded-full bg-white/10"><motion.div className="h-full bg-pink shadow-[0_0_8px_#ff2fa6]" initial={false} animate={{ width: k < i ? "100%" : k === i ? "50%" : "0%" }} /></div>
        ))}</div>
        <div className="mt-3 flex items-center gap-2">
          <Avatar avatar={projectAvatar} size={32} />
          <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{projectName}</p><p className="text-[11px] text-white/45">{preview ? "Preview" : "Application"} · step {Math.min(i + 1, total)} of {total}</p></div>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-white/60 hover:bg-white/10" aria-label="Close"><LIcon name="x" size={20} animate={false} /></button>
        </div>

        <div className="relative flex flex-1 flex-col justify-center py-6">
          <AnimatePresence mode="wait" custom={dir}>
            <motion.div key={i} custom={dir} initial={{ opacity: 0, x: dir * 50, scale: 0.97 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: -dir * 50, scale: 0.97 }} transition={{ type: "spring", stiffness: 320, damping: 30 }}>
              {!isFinal && s ? (
                <div className="space-y-3">
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-[92%] rounded-[24px] rounded-tl-md bg-white/[.06] p-4 ring-1 ring-white/10">
                    <div className="mb-2"><IconTile name={stepMeta(s.type).icon} size={34} /></div>
                    <p className="font-display text-xl font-semibold leading-snug">{s.title}</p>
                    {s.text && <p className="mt-1.5 whitespace-pre-wrap text-[15px] leading-relaxed text-white/70">{s.text}</p>}
                    {!s.required && s.type !== "message" && <p className="mt-2 text-[11px] font-semibold uppercase tracking-wider text-white/35">Optional</p>}
                  </motion.div>
                  {s.button?.url && (
                    <motion.a initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} href={s.button.url} target="_blank" rel="noopener noreferrer" onClick={() => setOpened((o) => ({ ...o, [s.id]: true }))}
                      className="inline-flex items-center gap-2 rounded-full bg-pink/15 px-4 py-2.5 text-sm font-semibold text-pink ring-1 ring-pink/40 hover:bg-pink/25">{s.button.label || "Open link"} <LIcon name="external" size={15} animate={false} /></motion.a>
                  )}
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} className="ml-auto max-w-[92%]">
                    {s.type === "task" && !s.requiresLink && (
                      <button type="button" onClick={() => set(ans[s.id] === "done" ? "" : "done")} className={`w-full rounded-2xl px-4 py-3 text-sm font-semibold ring-1 transition ${ans[s.id] === "done" ? "bg-emerald-400/15 text-emerald-200 ring-emerald-300/40" : "bg-white/5 text-white/80 ring-white/15"}`}>
                        {ans[s.id] === "done" ? <span className="inline-flex items-center gap-1.5"><LIcon name="check" size={16} /> Done</span> : opened[s.id] || !s.button ? "I've done this" : "Open the link first, then confirm"}</button>
                    )}
                    {(s.type === "short" || s.type === "link" || s.type === "proof" || s.type === "wallet" || (s.type === "task" && s.requiresLink)) && (
                      <input autoFocus className="input" inputMode={s.type === "short" ? "text" : "url"} placeholder={s.type === "wallet" ? "Solana address" : s.type === "short" ? "Your answer" : "https://…"} value={ans[s.id] || ""} onChange={(e) => set(e.target.value)} onKeyDown={(e) => e.key === "Enter" && next()} />
                    )}
                    {s.type === "long" && <textarea autoFocus className="input min-h-32 resize-none" maxLength={2000} placeholder="Your answer" value={ans[s.id] || ""} onChange={(e) => set(e.target.value)} />}
                    {s.type === "username" && (
                      <input autoFocus className="input" placeholder={s.platform === "discord" ? "Discord username" : s.platform === "telegram" ? "@telegram or t.me link" : "@handle or x.com link"} value={ans[s.id] || ""}
                        onChange={(e) => set(e.target.value)} onBlur={(e) => set(normalizeUsername(e.target.value, s.platform))} onKeyDown={(e) => e.key === "Enter" && (set(normalizeUsername((e.target as HTMLInputElement).value, s.platform)), next())} />
                    )}
                    {s.type === "choice" && (
                      <div className="grid gap-2">{(s.options || []).map((o) => {
                        const on = s.multi ? (multi[s.id] || []).includes(o) : ans[s.id] === o;
                        return <motion.button key={o} type="button" whileTap={{ scale: 0.97 }} onClick={() => { setErr(null); if (s.multi) setMulti((m) => ({ ...m, [s.id]: on ? (m[s.id] || []).filter((x) => x !== o) : [...(m[s.id] || []), o] })); else set(o); }}
                          className={`rounded-2xl px-4 py-3 text-left text-sm font-medium ring-1 transition ${on ? "bg-pink text-white ring-pink shadow-[0_0_20px_-6px_#ff2fa6]" : "bg-white/5 text-white/80 ring-white/15 hover:ring-pink/40"}`}>{o}</motion.button>;
                      })}</div>
                    )}
                    {s.type === "file" && (
                      <div>
                        <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { pickFile(e.target.files?.[0]); e.target.value = ""; }} />
                        {ans[s.id] ? <div className="relative overflow-hidden rounded-2xl ring-1 ring-white/10"><img src={ans[s.id]} alt="" className="max-h-64 w-full object-contain" /><button type="button" onClick={() => set("")} className="absolute right-2 top-2 rounded-full bg-black/70 px-2 py-1 text-xs">Remove</button></div>
                          : <button type="button" onClick={() => fileRef.current?.click()} className="w-full rounded-2xl border border-dashed border-white/20 py-8 text-sm text-white/60 hover:border-pink/50"><span className="inline-flex flex-col items-center gap-1.5"><LIcon name="file" size={26} />Upload image</span></button>}
                      </div>
                    )}
                  </motion.div>
                  {err && <p className="text-right text-sm text-red-300">{err}</p>}
                </div>
              ) : (
                <div className="text-center">
                  <motion.img src="/brand/star-192.png" alt="" className="mx-auto h-20 w-20 drop-shadow-[0_0_24px_#ff2fa6]" animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.06, 1] }} transition={{ repeat: Infinity, duration: 3 }} />
                  <h3 className="mt-4 font-display text-2xl font-semibold">Ready to apply</h3>
                  <p className="mt-1 text-sm text-white/60">{answered} answer{answered === 1 ? "" : "s"} · your Shine profile, socials and wallet are attached. Sign with your Shine wallet to send.</p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex gap-2">
          {i > 0 && <Button variant="glass" size="lg" className="flex-1" onClick={() => go(-1)}>Back</Button>}
          {!isFinal ? <Button size="lg" className="flex-[2]" onClick={next}>{s?.type === "message" ? "Continue" : !s?.required && !val ? "Skip" : "Next"}</Button>
            : <Button size="lg" className="flex-[2]" loading={busy} onClick={() => (preview ? (toast("Preview only — nothing was sent", "ok"), onClose()) : final())}>{preview ? "Finish preview" : "Sign & apply"}</Button>}
        </div>
      </div>
    </motion.div>
  );
  return typeof document === "undefined" ? null : createPortal(body, document.body);
}
export function StepFlowPreview({ steps, projectName, onClose }: { steps: ApplyStep[]; projectName: string; onClose: () => void }) {
  return <StepFlow preview steps={steps} projectName={projectName} onClose={onClose} onSubmit={async () => {}} />;
}
