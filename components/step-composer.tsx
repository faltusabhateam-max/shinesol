"use client";
import { useState } from "react";
import { AnimatePresence, motion, Reorder, useDragControls } from "framer-motion";
import { BottomSheet } from "./bottom-sheet";
import { Button } from "./ui";
import { Toggle } from "./settings-ui";
import { STEP_TYPES, newStep, stepIssues, stepMeta, type ApplyStep, type StepType } from "@/lib/steps";
import { StepFlowPreview } from "./step-flow";
import { IconTile, LIcon } from "./line-icons";

const Grip = <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.6" /><circle cx="15" cy="6" r="1.6" /><circle cx="9" cy="12" r="1.6" /><circle cx="15" cy="12" r="1.6" /><circle cx="9" cy="18" r="1.6" /><circle cx="15" cy="18" r="1.6" /></svg>;
const Chev = ({ up }: { up?: boolean }) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d={up ? "M6 15l6-6 6 6" : "M6 9l6 6 6-6"} /></svg>;

function StepCard({ s, i, n, onChange, onRemove, onMove }: { s: ApplyStep; i: number; n: number; onChange: (p: Partial<ApplyStep>) => void; onRemove: () => void; onMove: (d: -1 | 1) => void }) {
  const drag = useDragControls();
  const [open, setOpen] = useState(!s.title);
  const m = stepMeta(s.type);
  const issue = stepIssues(s);
  return (
    <Reorder.Item value={s} dragListener={false} dragControls={drag} className="list-none" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}>
      <div className={`relative rounded-[22px] rounded-tl-md bg-white/[.04] ring-1 ${issue ? "ring-amber-300/30" : "ring-white/10"}`}>
        <div className="flex items-center gap-2 p-3">
          <button type="button" onPointerDown={(e) => drag.start(e)} className="cursor-grab touch-none text-white/35 hover:text-white active:cursor-grabbing" aria-label="Drag to reorder">{Grip}</button>
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-pink/15 text-[11px] font-bold text-pink ring-1 ring-pink/30">{i + 1}</span>
          <button type="button" onClick={() => setOpen(!open)} className="min-w-0 flex-1 text-left">
            <p className="truncate text-sm font-semibold">{s.title || <span className="text-white/40">Untitled step</span>}</p>
            <p className="flex items-center gap-1 text-[11px] text-white/45"><LIcon name={m.icon} size={12} animate={false} /> {m.label} · {s.type === "message" ? "Info" : s.required ? "Required" : "Optional"}{issue && <span className="text-amber-200"> · {issue}</span>}</p>
          </button>
          <button type="button" disabled={i === 0} onClick={() => onMove(-1)} className="rounded-full p-1.5 text-white/50 hover:bg-white/10 disabled:opacity-20" aria-label="Move up"><Chev up /></button>
          <button type="button" disabled={i === n - 1} onClick={() => onMove(1)} className="rounded-full p-1.5 text-white/50 hover:bg-white/10 disabled:opacity-20" aria-label="Move down"><Chev /></button>
        </div>
        <AnimatePresence initial={false}>
          {open && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="space-y-3 border-t border-white/5 p-3">
                <input className="input" placeholder="Step title" maxLength={120} value={s.title} onChange={(e) => onChange({ title: e.target.value })} />
                <textarea className="input min-h-20 resize-y" placeholder={s.type === "message" ? "Your message to applicants…" : "Description / instructions (optional)"} maxLength={1000} value={s.text || ""} onChange={(e) => onChange({ text: e.target.value })} />
                {s.type === "username" && (
                  <div className="flex gap-1.5">{(["x", "telegram", "discord"] as const).map((p) => (
                    <button key={p} type="button" onClick={() => onChange({ platform: p })} className={`flex-1 rounded-xl py-2 text-xs font-semibold ring-1 ${s.platform === p ? "grad text-white ring-pink" : "bg-white/5 text-white/60 ring-white/10"}`}>{p === "x" ? "X" : p === "telegram" ? "Telegram" : "Discord"}</button>
                  ))}</div>
                )}
                {s.type === "choice" && (
                  <div className="space-y-1.5">
                    {(s.options || []).map((o, k) => (
                      <div key={k} className="flex gap-1.5">
                        <input className="input !py-2" placeholder={`Option ${k + 1}`} maxLength={80} value={o} onChange={(e) => onChange({ options: (s.options || []).map((x, j) => (j === k ? e.target.value : x)) })} />
                        <button type="button" onClick={() => onChange({ options: (s.options || []).filter((_, j) => j !== k) })} className="px-2 text-white/40 hover:text-red-300" aria-label="Remove option">✕</button>
                      </div>
                    ))}
                    {(s.options || []).length < 10 && <button type="button" onClick={() => onChange({ options: [...(s.options || []), ""] })} className="text-xs font-semibold text-pink">+ Add option</button>}
                    <label className="flex items-center justify-between text-sm text-white/70">Allow multiple <Toggle label="Multiple" on={!!s.multi} onChange={(v) => onChange({ multi: v })} /></label>
                  </div>
                )}
                <div className="rounded-2xl bg-black/25 p-3">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-white/40">{s.type === "task" ? "Task link (button)" : "Button (optional)"}</p>
                  <div className="grid gap-1.5 sm:grid-cols-[1fr_1.6fr]">
                    <input className="input !py-2" placeholder="Label, e.g. Join Telegram" maxLength={40} value={s.button?.label || ""} onChange={(e) => onChange({ button: { label: e.target.value, url: s.button?.url || "" } })} />
                    <input className="input !py-2" inputMode="url" placeholder="https://t.me/yourgroup" maxLength={300} value={s.button?.url || ""} onChange={(e) => onChange({ button: { label: s.button?.label || "", url: e.target.value } })} />
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-white/70">
                  {s.type !== "message" && <label className="flex items-center gap-2">Required <Toggle label="Required" on={s.required} onChange={(v) => onChange({ required: v })} /></label>}
                  {s.type === "task" && <label className="flex items-center gap-2">Requires link <Toggle label="Requires link" on={!!s.requiresLink} onChange={(v) => onChange({ requiresLink: v })} /></label>}
                  <button type="button" onClick={onRemove} className="ml-auto text-xs font-semibold text-red-300 hover:underline">Delete step</button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Reorder.Item>
  );
}

/** Manual "Apply steps" composer: message-style step cards, reorderable, with live preview. */
export function StepComposer({ steps, onChange, projectName }: { steps: ApplyStep[]; onChange: (s: ApplyStep[]) => void; projectName: string }) {
  const [picker, setPicker] = useState(false);
  const [preview, setPreview] = useState(false);
  const add = (t: StepType) => { onChange([...steps, newStep(t)]); setPicker(false); };
  const upd = (id: string, p: Partial<ApplyStep>) => onChange(steps.map((s) => (s.id === id ? { ...s, ...p } : s)));
  const move = (i: number, d: -1 | 1) => { const a = [...steps]; const [x] = a.splice(i, 1); a.splice(i + d, 0, x); onChange(a); };
  return (
    <div className="glass rounded-3xl p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 font-semibold"><IconTile name="spark" size={32} />Apply steps</h3>
          <p className="mt-1 text-sm text-white/55">{steps.length ? "Applicants go through these one card at a time, then sign with their Shine wallet." : "No steps — applicants use one-tap apply with their Shine profile. Add steps to guide them through tasks and questions."}</p>
        </div>
        {!!steps.length && <Button size="sm" variant="glass" onClick={() => setPreview(true)}>Preview</Button>}
      </div>
      <Reorder.Group axis="y" values={steps} onReorder={onChange} className="space-y-2">
        <AnimatePresence initial={false}>
          {steps.map((s, i) => <StepCard key={s.id} s={s} i={i} n={steps.length} onChange={(p) => upd(s.id, p)} onRemove={() => onChange(steps.filter((x) => x.id !== s.id))} onMove={(d) => move(i, d)} />)}
        </AnimatePresence>
      </Reorder.Group>
      {steps.length < 20 && <motion.button type="button" whileTap={{ scale: 0.98 }} onClick={() => setPicker(true)} className="mt-3 w-full rounded-2xl border border-dashed border-pink/40 py-3 text-sm font-semibold text-pink hover:bg-pink/5">+ Add step</motion.button>}
      <BottomSheet open={picker} onClose={() => setPicker(false)} title="Add a step">
        <div className="grid grid-cols-2 gap-2 pb-4">
          {STEP_TYPES.map((t, i) => (
            <motion.button key={t.type} type="button" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }} whileTap={{ scale: 0.96 }} onClick={() => add(t.type)}
              className="rounded-2xl bg-white/[.04] p-3 text-left ring-1 ring-white/10 hover:ring-pink/40">
              <IconTile name={t.icon} size={34} /><p className="mt-1 text-sm font-semibold">{t.label}</p><p className="text-[11px] text-white/45">{t.hint}</p>
            </motion.button>
          ))}
        </div>
      </BottomSheet>
      {preview && <StepFlowPreview steps={steps} projectName={projectName} onClose={() => setPreview(false)} />}
    </div>
  );
}
