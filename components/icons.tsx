"use client";
import { motion } from "framer-motion";

const S = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

export function XIcon({ size = 18, className = "" }: { size?: number; className?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden><path d="M17.75 3h3.07l-6.7 7.66L22 21h-6.17l-4.83-6.32L5.47 21H2.4l7.17-8.2L2 3h6.33l4.37 5.77L17.75 3Zm-1.08 16.2h1.7L7.4 4.73H5.58l11.1 14.47Z" /></svg>;
}
export function TelegramIcon({ size = 18, className = "" }: { size?: number; className?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden><path d="M21.94 4.3 18.7 19.6c-.24 1.08-.88 1.35-1.79.84l-4.94-3.64-2.38 2.3c-.27.26-.49.48-1 .48l.36-5.04 9.17-8.28c.4-.36-.09-.55-.62-.2L6.16 13.2 1.28 11.68c-1.06-.33-1.08-1.06.22-1.57L20.58 2.75c.88-.33 1.65.2 1.36 1.55Z" /></svg>;
}
export function DiscordIcon({ size = 18, className = "" }: { size?: number; className?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden><path d="M20.32 4.37A19.8 19.8 0 0 0 15.4 2.84a13.7 13.7 0 0 0-.63 1.29 18.4 18.4 0 0 0-5.53 0 13 13 0 0 0-.64-1.29 19.7 19.7 0 0 0-4.92 1.53C.56 9.03-.29 13.57.13 18.05a19.9 19.9 0 0 0 6.03 3.05c.49-.66.92-1.36 1.29-2.1a12.9 12.9 0 0 1-2.03-.97c.17-.12.34-.25.5-.38a14.2 14.2 0 0 0 12.16 0c.16.13.33.26.5.38-.65.38-1.33.71-2.03.97.37.74.8 1.44 1.29 2.1a19.8 19.8 0 0 0 6.03-3.05c.5-5.2-.84-9.7-3.55-13.68ZM8.02 15.3c-1.18 0-2.16-1.09-2.16-2.42s.95-2.42 2.16-2.42c1.2 0 2.18 1.1 2.16 2.42 0 1.33-.96 2.42-2.16 2.42Zm7.96 0c-1.18 0-2.16-1.09-2.16-2.42s.95-2.42 2.16-2.42c1.21 0 2.18 1.1 2.16 2.42 0 1.33-.95 2.42-2.16 2.42Z" /></svg>;
}

/* Animated navigation icons — each animates when active */
export function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" {...S}>
      <motion.path d="M3 10.5 12 3l9 7.5" animate={active ? { y: [0, -1.5, 0] } : { y: 0 }} transition={{ duration: 0.5 }} />
      <path d="M5 9.5V20h14V9.5" />
      <motion.path d="M10 20v-5h4v5" animate={{ pathLength: active ? [0, 1] : 1 }} transition={{ duration: 0.5 }} />
    </svg>
  );
}
export function EventsIcon({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" {...S}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="3" />
      <path d="M3.5 10h17" />
      <motion.path d="M8 3v4M16 3v4" animate={active ? { y: [0, -1.5, 0] } : {}} transition={{ duration: 0.45 }} />
      <motion.path d="m9 15 2 2 4-4" initial={false} animate={{ pathLength: active ? 1 : 0, opacity: active ? 1 : 0 }} transition={{ duration: 0.4, delay: 0.1 }} />
    </svg>
  );
}
export function RegisterIcon({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" {...S}>
      <rect x="5" y="3" width="14" height="18" rx="2.5" />
      <motion.path d="M9 8h6M9 12h6M9 16h3" animate={{ pathLength: active ? [0, 1] : 1 }} transition={{ duration: 0.6 }} />
    </svg>
  );
}
export function ReviewIcon({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" {...S}>
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v13a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 18.5z" />
      <motion.path d="m8 12 3 3 5-6" animate={{ pathLength: active ? [0, 1] : 1 }} transition={{ duration: 0.5 }} />
    </svg>
  );
}
export function ChatIcon({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" {...S}>
      <path d="M20 12a8 8 0 0 1-11.6 7.15L4 20.5l1.35-4.4A8 8 0 1 1 20 12Z" />
      {[8.5, 12, 15.5].map((x, i) => (
        <motion.circle key={x} cx={x} cy="12" r="0.9" fill="currentColor" stroke="none" animate={active ? { y: [0, -1.6, 0] } : { y: 0 }} transition={{ duration: 0.6, delay: i * 0.1, repeat: active ? 1 : 0 }} />
      ))}
    </svg>
  );
}
export function WalletIcon({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" {...S}>
      <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18a2 2 0 0 1 2 2v1" />
      <rect x="3.5" y="7.5" width="17" height="12.5" rx="3" />
      <motion.rect x="14.5" y="11.5" width="7" height="4.5" rx="2" animate={active ? { x: [14.5, 13.3, 14.5] } : {}} transition={{ duration: 0.5 }} />
    </svg>
  );
}
export const ICON = {
  copy: <svg width="16" height="16" viewBox="0 0 24 24" {...S}><rect x="8" y="8" width="12" height="12" rx="2.5" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /></svg>,
  share: <svg width="16" height="16" viewBox="0 0 24 24" {...S}><path d="M12 3v12M7 8l5-5 5 5" /><path d="M5 13v5a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3v-5" /></svg>,
  edit: <svg width="16" height="16" viewBox="0 0 24 24" {...S}><path d="M4 20h4L19 9l-4-4L4 16z" /><path d="m13.5 6.5 4 4" /></svg>,
  plus: <svg width="18" height="18" viewBox="0 0 24 24" {...S}><path d="M12 5v14M5 12h14" /></svg>,
  image: <svg width="18" height="18" viewBox="0 0 24 24" {...S}><rect x="3" y="4" width="18" height="16" rx="3" /><circle cx="9" cy="10" r="2" /><path d="m21 16-5-5-9 9" /></svg>,
  send: <svg width="18" height="18" viewBox="0 0 24 24" {...S}><path d="M4 12 20 4l-4 16-4-7z" /><path d="m12 13 8-9" /></svg>,
  search: <svg width="18" height="18" viewBox="0 0 24 24" {...S}><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>,
  trash: <svg width="16" height="16" viewBox="0 0 24 24" {...S}><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></svg>,
  lock: <svg width="16" height="16" viewBox="0 0 24 24" {...S}><rect x="5" y="10" width="14" height="10" rx="2.5" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>,
  clock: <svg width="14" height="14" viewBox="0 0 24 24" {...S}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>,
  refresh: <svg width="16" height="16" viewBox="0 0 24 24" {...S}><path d="M20 11a8 8 0 1 0-2.3 5.7" /><path d="M20 4v7h-7" /></svg>,
  external: <svg width="14" height="14" viewBox="0 0 24 24" {...S}><path d="M14 4h6v6M20 4l-9 9" /><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" /></svg>,
  arrowUp: <svg width="18" height="18" viewBox="0 0 24 24" {...S}><path d="M7 17 17 7M8 7h9v9" /></svg>,
  arrowDown: <svg width="18" height="18" viewBox="0 0 24 24" {...S}><path d="M17 7 7 17M16 17H7V8" /></svg>,
  key: <svg width="18" height="18" viewBox="0 0 24 24" {...S}><circle cx="8" cy="15" r="4" /><path d="m11 12 9-9M17 6l3 3M15 8l2 2" /></svg>,
  logout: <svg width="16" height="16" viewBox="0 0 24 24" {...S}><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l-5-5 5-5M5 12h11" /></svg>,
  sol: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6.5h13l-2 2.5H4zM4 10.75h13l2 2.5H6zM6 15h13l-2 2.5H4z" /></svg>,
  bold: <svg width="16" height="16" viewBox="0 0 24 24" {...S} strokeWidth={2.6}><path d="M7 5h6a3.5 3.5 0 0 1 0 7H7zM7 12h7a3.5 3.5 0 0 1 0 7H7z" /></svg>,
  tag: <svg width="16" height="16" viewBox="0 0 24 24" {...S}><path d="M3 12V4h8l10 10-8 8z" /><circle cx="7.5" cy="8.5" r="1.3" /></svg>,
  wallet: <svg width="16" height="16" viewBox="0 0 24 24" {...S}><rect x="3.5" y="6" width="17" height="13" rx="3" /><path d="M15 12.5h3" /></svg>,
};
export function TasksIcon({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" {...S}>
      <rect x="3.5" y="8" width="17" height="4" rx="1" />
      <path d="M5 12v8.5h14V12M12 8v12.5" />
      <motion.path d="M12 8S10.5 3.5 8 4.5 9 8 12 8zM12 8s1.5-4.5 4-3.5S15 8 12 8z" animate={active ? { y: [0, -2, 0], rotate: [0, -6, 6, 0] } : { y: 0 }} transition={{ duration: 0.6 }} style={{ originX: "50%", originY: "100%" }} />
    </svg>
  );
}
