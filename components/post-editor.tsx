"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, Reorder } from "framer-motion";
import type { FieldType, FormField, Post, ShineUser } from "@/lib/types";
import { Button, Card } from "./ui";
import { ICON } from "./icons";
import { fileToDataUrl } from "@/lib/image";
import { createPost, updatePost } from "@/lib/db";
import { toDate } from "@/lib/format";
import { StatusOverlay, friendlyError } from "./status";
import { BottomSheet } from "./bottom-sheet";
import { FIELD_TYPES, TypeBadge, defaultTaskUrl, isTask, metaOf } from "./field-types";
import { StepComposer } from "./step-composer";
import { cleanSteps, stepIssues, type ApplyStep } from "@/lib/steps";

const uid = () => Math.random().toString(36).slice(2, 9);
const isChoice = (t: FieldType) => t === "choice" || t === "multi";
function newField(t: FieldType, author?: ShineUser | null): FormField {
  const m = metaOf(t);
  return { id: uid(), label: m.defaultLabel, type: t, required: true, ...(isChoice(t) ? { options: ["", ""] } : {}), ...(m.taskUrl ? { url: defaultTaskUrl(t, author) } : {}) };
}
const defaultForm = (a: ShineUser): FormField[] => [newField("x_follow", a), newField("telegram", a), { ...newField("paragraph", a) }, { ...newField("link", a), required: false }];
const toLocalInput = (d: Date | null) => (d ? new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "");

export function PostEditor({ author, post }: { author: ShineUser; post?: Post }) {
  const router = useRouter();
  const [text, setText] = useState(post?.text || "");
  const [image, setImage] = useState<string | null>(post?.image || null);
  const [ratio, setRatio] = useState<number | null>(post?.imageRatio || null);
  const [form, setForm] = useState<FormField[]>([]);
  const [steps, setSteps] = useState<ApplyStep[]>(post?.steps || []);
  const [picker, setPicker] = useState(false);
  const [descOpen, setDescOpen] = useState<Record<string, boolean>>({});
  const [ends, setEnds] = useState(toLocalInput(toDate(post?.endsAt ?? null)));
  const [busy, setBusy] = useState(false);
  const [imgBusy, setImgBusy] = useState(false);
  const [status, setStatus] = useState<{ kind: "success" | "failed"; title: string; msg?: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const pick = async (f?: File) => {
    if (!f) return;
    setImgBusy(true);
    try { const r = await fileToDataUrl(f, 1400, 600_000); setImage(r.dataUrl); setRatio(r.ratio); }
    catch (e) { setStatus({ kind: "failed", title: "Image not added", msg: friendlyError(e) }); }
    setImgBusy(false);
  };
  const upd = (id: string, patch: Partial<FormField>) => setForm((f) => f.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const validForm = form.every((f) => f.label.trim() && (!isChoice(f.type) || (f.options || []).filter((o) => o.trim()).length >= 2) && (!metaOf(f.type).taskUrl || /^https?:\/\/\S+\.\S+/.test(f.url || "")));
  const stepsOk = steps.every((x) => !stepIssues(x));
  const canSubmit = text.trim().length > 0 && stepsOk;

  const submit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    const endsAt = ends ? new Date(ends) : null;
    if (endsAt && endsAt.getTime() < Date.now() + 60_000) { setBusy(false); setStatus({ kind: "failed", title: "Check the end date", msg: "The end date and time must be in the future." }); return; }
    const clean = form.map((f) => ({
      id: f.id, label: f.label.trim(), type: f.type, required: f.required,
      ...(isChoice(f.type) ? { options: (f.options || []).map((o) => o.trim()).filter(Boolean) } : {}),
      ...(metaOf(f.type).taskUrl && f.url ? { url: f.url.trim().slice(0, 300) } : {}),
      ...(f.description?.trim() ? { description: f.description.trim().slice(0, 400) } : {}),
    }));
    try {
      if (post) await updatePost(post.id, { text: text.trim(), image, imageRatio: ratio, form: [], endsAt, steps: cleanSteps(steps) });
      else await createPost(author, { text: text.trim(), image, imageRatio: ratio, form: [], endsAt, steps: cleanSteps(steps) });
      setStatus({ kind: "success", title: post ? "Post updated" : "Post published", msg: post ? "Your changes are live." : "Your opportunity is now live in Events." });
    } catch (e) { setStatus({ kind: "failed", title: "Couldn't publish", msg: friendlyError(e) }); }
    setBusy(false);
  };

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <textarea value={text} onChange={(e) => setText(e.target.value.slice(0, 2000))} rows={5} placeholder="Describe the opportunity: role, rewards in SOL, requirements, timeline…"
          className="w-full resize-y bg-transparent text-[1rem] leading-relaxed outline-none placeholder:text-white/35" />
        <AnimatePresence>
          {image && (
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="relative mt-2 overflow-hidden rounded-2xl bg-white/[.015]">
              <img src={image} alt="" className="block h-auto w-full" />
              <button onClick={() => { setImage(null); setRatio(null); }} className="absolute right-2 top-2 rounded-full bg-black/70 p-2 text-white hover:bg-black" aria-label="Remove image">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3">
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} />
          <Button variant="ghost" size="sm" loading={imgBusy} onClick={() => fileRef.current?.click()} className="!text-pink">{ICON.image} {image ? "Replace image" : "Add image"}</Button>
          <span className="text-xs text-white/40">{text.length}/2000</span>
        </div>
      </Card>

      <Card className="p-4">
        <label className="label" htmlFor="ends">Application deadline (optional)</label>
        <input id="ends" type="datetime-local" value={ends} onChange={(e) => setEnds(e.target.value)} className="input [color-scheme:dark]" />
        <p className="mt-1.5 text-xs text-white/45">Applications close automatically at this time. You can also close or reopen manually.</p>
      </Card>

      <StepComposer steps={steps} onChange={setSteps} projectName={author.project?.name || author.username} />
      {!stepsOk && <p className="text-center text-xs text-amber-200">Finish the highlighted steps before publishing.</p>}

      <div className="flex gap-2">
        <Button variant="glass" className="flex-1" onClick={() => router.back()}>Cancel</Button>
        <Button size="lg" className="flex-[2]" loading={busy} disabled={!canSubmit} onClick={submit}>{post ? "Save changes" : "Publish post"}</Button>
      </div>
      <StatusOverlay kind={status?.kind ?? null} title={status?.title} message={status?.msg} onClose={() => { const ok = status?.kind === "success"; setStatus(null); if (ok) router.push("/events"); }} />
    </div>
  );
}
