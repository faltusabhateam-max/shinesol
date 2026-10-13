"use client";
import { motion } from "framer-motion";
import type { ReactNode } from "react";

/** Professional line icons (lucide-style paths) with subtle framer-motion micro-animations. */
type P = { size?: number; className?: string; animate?: boolean };
const paths: Record<string, ReactNode> = {
  message: <><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.9A8 8 0 1 1 21 12z" /><path d="M8.5 11h7M8.5 14h4" /></>,
  task: <><rect x="3.5" y="3.5" width="17" height="17" rx="4" /><path d="M8 12.2l2.7 2.7L16.2 9" /></>,
  short: <><path d="M4 7h16M4 12h10" /><path d="M17 17.5l3-3-2-2-3 3V17.5z" /></>,
  long: <><path d="M4 6h16M4 10h16M4 14h16M4 18h9" /></>,
  link: <><path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4L11.5 6" /><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1.5-1.5" /></>,
  choice: <><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="3.5" fill="currentColor" stroke="none" /></>,
  username: <><circle cx="12" cy="8.5" r="3.8" /><path d="M4.5 20a7.5 7.5 0 0 1 15 0" /></>,
  wallet: <><rect x="3" y="6" width="18" height="13" rx="3" /><path d="M3 10h18M16.5 14.5h.01" /><path d="M7 6V4.5h10V6" /></>,
  proof: <><path d="M7 3h7l4 4v14H7z" /><path d="M14 3v4h4M10 13l2 2 3.5-3.5" /></>,
  file: <><rect x="3" y="4" width="18" height="16" rx="3" /><circle cx="9" cy="10" r="1.8" /><path d="M21 16l-5-5-8 9" /></>,
  shield: <><path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z" /><path d="M8.5 12l2.5 2.5 4.5-4.5" /></>,
  coins: <><ellipse cx="9" cy="7" rx="5.5" ry="2.5" /><path d="M3.5 7v4c0 1.4 2.5 2.5 5.5 2.5s5.5-1.1 5.5-2.5V7" /><path d="M9.5 15.5c.9 1.3 3.3 2 5.5 2 3 0 5.5-1.1 5.5-2.5v-4c0-1.3-2-2.3-4.6-2.5" /></>,
  signature: <><path d="M3 17c3-1 4-8 6-8s0 7 2 7 2-4 4-4 1.5 3 3 3h3" /><path d="M3 21h18" /></>,
  scale: <><path d="M12 3v18M6 21h12M5 7h14M7 7l-3 7a3 3 0 0 0 6 0zM17 7l-3 7a3 3 0 0 0 6 0z" /></>,
  receipt: <><path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" /><path d="M9 8h6M9 12h6M9 16h3" /></>,
  spark: <><path d="M12 3l1.9 5.6L19.5 10l-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.4z" /></>,
  check: <><circle cx="12" cy="12" r="8.5" /><path d="M8 12.3l2.7 2.7L16 9.6" /></>,
  clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>,
  x: <><circle cx="12" cy="12" r="8.5" /><path d="M9 9l6 6M15 9l-6 6" /></>,
  skip: <><circle cx="12" cy="12" r="8.5" /><path d="M8 12h8" /></>,
  external: <><path d="M14 4h6v6M20 4l-9 9" /><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" /></>,
  handshake: <><path d="M3 12l4-4 4 2 3-2 7 4" /><path d="M7 8l-4 5 5 5 2-2M21 12l-4 6-3-2M10 16l2 2M12 14l2 2" /></>,
  repeat: <><path d="M17 2l3 3-3 3" /><path d="M4 11V9a4 4 0 0 1 4-4h12M7 22l-3-3 3-3" /><path d="M20 13v2a4 4 0 0 1-4 4H4" /></>,
  heart: <><path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.3 4.3 4.3 0 0 1 19.5 10C19.5 15.4 12 20 12 20z" /></>,
  telegram: <><path d="M21 4L3 11l6 2.2L18 7l-7 7.5V20l3.2-3.8L18 19z" /></>,
  gift: <><rect x="3.5" y="8" width="17" height="4" rx="1" /><path d="M5 12v8.5h14V12M12 8v12.5M12 8S10.5 3.5 8 4.5 9 8 12 8zM12 8s1.5-4.5 4-3.5S15 8 12 8z" /></>,
  share: <><path d="M12 3v12M7.5 7.5L12 3l4.5 4.5" /><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" /></>,
  users: <><circle cx="9" cy="8" r="3.5" /><path d="M3 20a6 6 0 0 1 12 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a5.5 5.5 0 0 1 3 5" /></>,
  bolt: <><path d="M13 3L4 14h7l-1 7 9-11h-7z" /></>,
};
const motions: Record<string, any> = {
  repeat: { rotate: [0, 180, 360] }, heart: { scale: [1, 1.15, 1] }, telegram: { x: [0, 1.5, 0], y: [0, -1.5, 0] }, gift: { rotate: [0, -6, 6, 0] }, bolt: { scale: [1, 1.12, 1] }, users: { y: [0, -1, 0] },
  task: { scale: [1, 1.08, 1] }, link: { rotate: [0, -10, 0] }, choice: { scale: [1, 0.9, 1] }, wallet: { y: [0, -1.5, 0] },
  shield: { scale: [1, 1.06, 1] }, coins: { y: [0, -1.5, 0] }, signature: { x: [0, 1.5, 0] }, scale: { rotate: [0, -6, 6, 0] },
  spark: { rotate: [0, 20, 0], scale: [1, 1.1, 1] }, clock: { rotate: [0, 8, 0] }, message: { y: [0, -1, 0] }, file: { scale: [1, 1.05, 1] },
};
export type IconName = keyof typeof paths;
export function LIcon({ name, size = 20, className = "", animate = true }: P & { name: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 ${className}`} aria-hidden>
      {paths[name] || paths.spark}
    </svg>
  );
}
/** Rounded pink tile with an animated icon. */
export function IconTile({ name, size = 36, className = "" }: { name: string; size?: number; className?: string }) {
  return (
    <span className={`icon-grad neu-sm grid shrink-0 place-items-center rounded-[30%] ${className}`} style={{ width: size, height: size }}>
      <LIcon name={name} size={Math.round(size * 0.5)} />
    </span>
  );
}
