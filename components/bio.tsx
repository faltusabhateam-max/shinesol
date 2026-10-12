"use client";
import { useRef, type ReactNode } from "react";
import { ICON } from "./icons";

/** Renders Shine's lightweight rich text: **bold** and [[tag]] chips. Safe: never uses innerHTML. */
export function RichText({ text, className = "" }: { text: string; className?: string }) {
  const lines = (text || "").split("\n");
  return (
    <div className={`whitespace-pre-wrap break-words leading-relaxed ${className}`}>
      {lines.map((ln, i) => (
        <span key={i}>{renderInline(ln)}{i < lines.length - 1 && "\n"}</span>
      ))}
    </div>
  );
}
function renderInline(s: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*([^*]+)\*\*|\[\[([^\]]+)\]\])/g;
  let last = 0, m: RegExpExecArray | null, k = 0;
  while ((m = re.exec(s))) {
    if (m.index > last) out.push(s.slice(last, m.index));
    if (m[2]) out.push(<strong key={k++} className="font-semibold text-white">{m[2]}</strong>);
    else if (m[3]) out.push(<span key={k++} className="chip">{m[3]}</span>);
    last = m.index + m[0].length;
  }
  if (last < s.length) out.push(s.slice(last));
  return out;
}

export function BioEditor({ value, onChange, max = 1200 }: { value: string; onChange: (v: string) => void; max?: number }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const wrap = (l: string, r: string, placeholder: string) => {
    const el = ref.current;
    if (!el) return;
    const { selectionStart: a, selectionEnd: b } = el;
    const sel = value.slice(a, b) || placeholder;
    const next = value.slice(0, a) + l + sel + r + value.slice(b);
    onChange(next.slice(0, max));
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(a + l.length, a + l.length + sel.length); });
  };
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[.04] focus-within:border-pink/70 focus-within:shadow-[0_0_0_4px_rgba(255,47,166,.15)]">
      <div className="flex items-center gap-1 border-b border-white/10 px-2 py-1.5">
        <button type="button" onClick={() => wrap("**", "**", "bold text")} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-white/80 hover:bg-white/10"> {ICON.bold} Bold</button>
        <button type="button" onClick={() => wrap("[[", "]]", "Tag")} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-white/80 hover:bg-white/10"> {ICON.tag} Tag</button>
        <span className="ml-auto pr-1 text-[11px] text-white/40">{value.length}/{max}</span>
      </div>
      <textarea ref={ref} value={value} onChange={(e) => onChange(e.target.value.slice(0, max))} rows={6}
        placeholder="Tell projects about yourself — skills, experience, achievements. Select text and tap Bold or Tag to highlight."
        className="block w-full resize-y bg-transparent px-4 py-3 text-[0.95rem] outline-none placeholder:text-white/35" />
      {value.trim() && (
        <div className="border-t border-white/10 px-4 py-3">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-white/40">Preview</p>
          <RichText text={value} className="text-sm text-white/80" />
        </div>
      )}
    </div>
  );
}
