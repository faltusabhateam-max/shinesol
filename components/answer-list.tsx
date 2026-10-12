"use client";
import type { Application, Post } from "@/lib/types";
import { TypeBadge } from "./field-types";
import { socialUrl } from "@/lib/handles";

import { answerKey, stepMeta } from "@/lib/steps";
import { IconTile, LIcon } from "./line-icons";

/** Answers to a post's Apply steps, one neat row per step. */
function StepAnswers({ app, post }: { app: Application; post?: Post | null }) {
  const a = app.answers as Record<string, string>;
  const steps = (post?.steps || []).filter((s) => s.type !== "message");
  const known = new Set(steps.map(answerKey));
  const extra = Object.keys(a).filter((k) => k.startsWith("s_") && !known.has(k));
  return (
    <div className="space-y-2">
      {steps.map((s, i) => {
        const v = a[answerKey(s)];
        const m = stepMeta(s.type);
        return (
          <div key={s.id} className="flex gap-3 rounded-2xl bg-white/[.04] p-3">
            <IconTile name={m.icon} size={32} />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-white/50">Step {i + 1} · {s.title}</p>
              {!v ? <p className="mt-0.5 inline-flex items-center gap-1 text-sm text-white/35"><LIcon name="skip" size={14} animate={false} />{s.required ? "No answer" : "Skipped (optional)"}</p>
                : v === "done" ? <p className="mt-0.5 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-300"><LIcon name="check" size={15} /> Completed</p>
                : v.startsWith("data:image/") ? <a href={v} target="_blank" rel="noopener noreferrer"><img src={v} alt="Proof" className="mt-1 max-h-48 rounded-xl ring-1 ring-white/10" /></a>
                : /^https?:\/\//i.test(v) ? <a href={v} target="_blank" rel="noopener noreferrer nofollow" className="mt-0.5 block break-all text-[15px] text-pink hover:underline">{v}</a>
                : s.type === "username" && v.startsWith("@") ? <a href={socialUrl(s.platform === "telegram" ? "telegram" : "x", v)} target="_blank" rel="noopener noreferrer" className="mt-0.5 block text-[15px] text-pink hover:underline">{v}</a>
                : <p className={`mt-0.5 whitespace-pre-wrap break-words text-[15px] text-white/85 ${s.type === "wallet" ? "font-mono text-sm" : ""}`}>{v}</p>}
            </div>
          </div>
        );
      })}
      {extra.map((k) => <p key={k} className="rounded-2xl bg-white/[.04] p-3 text-sm text-white/70 break-words">{a[k].startsWith("data:image/") ? "Image" : a[k]}</p>)}
    </div>
  );
}

export function AnswerList({ app, post }: { app: Application; post?: Post | null }) {
  if ((app.answers as any)?.kind === "steps") return <StepAnswers app={app} post={post} />;
  const fields = post?.form || [];
  const entries = Object.entries(app.answers || {});
  if (!entries.length) return <p className="text-sm text-white/50">No answers provided.</p>;
  const order = fields.length ? fields.map((f) => f.id).filter((id) => id in app.answers) : entries.map(([k]) => k);
  return (
    <div className="space-y-2.5">
      {order.map((id) => {
        const f = fields.find((x) => x.id === id);
        const v = app.answers[id];
        const str = Array.isArray(v) ? v.join(", ") : v;
        const href = typeof v !== "string" ? "" : /^https?:\/\//i.test(v) ? v
          : f?.type === "x_follow" && v.startsWith("@") ? socialUrl("x", v)
          : f?.type === "telegram" && v.startsWith("@") ? socialUrl("telegram", v) : "";
        return (
          <div key={id} className="flex gap-3 rounded-2xl bg-white/[.04] p-3">
            {f && <TypeBadge type={f.type} size={30} />}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-white/50">{f?.label || "Answer"}</p>
              {Array.isArray(v) ? <div className="mt-1 flex flex-wrap">{v.map((x) => <span key={x} className="chip">{x}</span>)}</div>
                : href ? <a href={href} target="_blank" rel="noopener noreferrer" className="mt-0.5 block break-all text-[15px] text-pink hover:underline">{str}</a>
                : <p className={`mt-0.5 whitespace-pre-wrap break-words text-[15px] text-white/85 ${f?.type === "wallet" ? "font-mono text-sm" : ""}`}>{str}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
