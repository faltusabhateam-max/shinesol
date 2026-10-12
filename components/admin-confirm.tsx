"use client";
import { useState } from "react";
import { BottomSheet } from "./bottom-sheet";
import { Button } from "./ui";

/** Confirmation sheet for destructive admin actions. When `typeToConfirm` is set the admin must type it. */
export function AdminConfirm({ open, title, text, confirmLabel, danger = true, typeToConfirm, onClose, onConfirm }: {
  open: boolean; title: string; text: string; confirmLabel: string; danger?: boolean; typeToConfirm?: string; onClose: () => void; onConfirm: () => Promise<void>;
}) {
  const [v, setV] = useState("");
  const [busy, setBusy] = useState(false);
  const ok = !typeToConfirm || v.trim().toLowerCase() === typeToConfirm.toLowerCase();
  return (
    <BottomSheet open={open} onClose={() => { if (!busy) { setV(""); onClose(); } }} title={title}>
      <div className="space-y-4 pb-4">
        <p className="text-center text-sm leading-relaxed text-white/65">{text}</p>
        {typeToConfirm && <input value={v} onChange={(e) => setV(e.target.value)} placeholder={`Type ${typeToConfirm} to confirm`} className="input text-center" autoCapitalize="off" />}
        <div className="flex gap-2">
          <Button variant="glass" size="lg" className="flex-1" onClick={() => { setV(""); onClose(); }}>Cancel</Button>
          <Button variant={danger ? "danger" : "pink"} size="lg" className="flex-[2]" loading={busy} disabled={!ok} onClick={async () => { setBusy(true); try { await onConfirm(); setV(""); } finally { setBusy(false); } }}>{confirmLabel}</Button>
        </div>
      </div>
    </BottomSheet>
  );
}
