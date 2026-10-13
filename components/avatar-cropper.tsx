"use client";
import { useEffect, useRef, useState } from "react";
import { Button, Sheet } from "./ui";
import { cropToDataUrl } from "@/lib/image";

const BOX = 280;
/** Square avatar cropper: drag to reposition, slider to zoom. Outputs a compressed 320×320 JPEG data URL. */
export function AvatarCropper({ img, onCancel, onDone }: { img: HTMLImageElement | null; onCancel: () => void; onDone: (dataUrl: string) => void }) {
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const base = img ? BOX / Math.min(img.naturalWidth, img.naturalHeight) : 1;
  const scale = base * zoom;
  const w = img ? img.naturalWidth * scale : 0, h = img ? img.naturalHeight * scale : 0;
  const clamp = (x: number, y: number) => ({ x: Math.min(0, Math.max(BOX - w, x)), y: Math.min(0, Math.max(BOX - h, y)) });
  useEffect(() => { if (img) { setZoom(1); const s = BOX / Math.min(img.naturalWidth, img.naturalHeight); setPos({ x: (BOX - img.naturalWidth * s) / 2, y: (BOX - img.naturalHeight * s) / 2 }); } }, [img]);
  useEffect(() => { setPos((p) => clamp(p.x, p.y)); }, [zoom]); // eslint-disable-line
  const done = () => { if (!img) return; onDone(cropToDataUrl(img, -pos.x / scale, -pos.y / scale, BOX / scale)); };
  return (
    <Sheet open={!!img} onClose={onCancel} title="Crop your photo">
      {img && (
        <div className="flex flex-col items-center">
          <div className="relative overflow-hidden rounded-3xl bg-black touch-none select-none" style={{ width: BOX, height: BOX }}
            onPointerDown={(e) => { (e.target as Element).setPointerCapture?.(e.pointerId); drag.current = { x: e.clientX, y: e.clientY, px: pos.x, py: pos.y }; }}
            onPointerMove={(e) => { if (drag.current) setPos(clamp(drag.current.px + e.clientX - drag.current.x, drag.current.py + e.clientY - drag.current.y)); }}
            onPointerUp={() => (drag.current = null)} onPointerCancel={() => (drag.current = null)}>
            <img src={img.src} alt="" draggable={false} className="pointer-events-none absolute max-w-none" style={{ width: w, height: h, left: pos.x, top: pos.y }} />
            <div className="pointer-events-none absolute inset-0 rounded-3xl" style={{ boxShadow: `inset 0 0 0 ${BOX}px rgba(0,0,0,.55)`, WebkitMaskImage: "radial-gradient(circle at center, transparent 69.5%, black 70%)", maskImage: "radial-gradient(circle at center, transparent 69.5%, black 70%)" }} />
            <div className="pointer-events-none absolute inset-0 m-auto rounded-full ring-2 ring-pink shadow-[var(--raise-sm)]" style={{ width: BOX * 0.99, height: BOX * 0.99 }} />
          </div>
          <input type="range" min={1} max={4} step={0.01} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="mt-5 w-full max-w-[280px] accent-[#ff5e8a]" aria-label="Zoom" />
          <p className="mt-2 text-xs text-white/45">Drag to reposition · slide to zoom</p>
          <div className="mt-5 flex w-full gap-2">
            <Button variant="glass" className="flex-1" onClick={onCancel}>Cancel</Button>
            <Button className="flex-[2]" onClick={done}>Use photo</Button>
          </div>
        </div>
      )}
    </Sheet>
  );
}
