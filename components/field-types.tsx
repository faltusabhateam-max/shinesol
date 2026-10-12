"use client";
import type { ReactNode } from "react";
import type { FieldType, ShineUser } from "@/lib/types";
import { DiscordIcon, TelegramIcon, XIcon } from "./icons";
import { socialUrl } from "@/lib/handles";

const S = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
const I = {
  short: <svg width="18" height="18" viewBox="0 0 24 24" {...S}><path d="M4 7h16M4 12h10" /></svg>,
  paragraph: <svg width="18" height="18" viewBox="0 0 24 24" {...S}><path d="M4 6h16M4 10h16M4 14h16M4 18h10" /></svg>,
  link: <svg width="18" height="18" viewBox="0 0 24 24" {...S}><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></svg>,
  choice: <svg width="18" height="18" viewBox="0 0 24 24" {...S}><circle cx="7" cy="8" r="2.5" /><circle cx="7" cy="16" r="2.5" /><path d="M12 8h8M12 16h8" /></svg>,
  multi: <svg width="18" height="18" viewBox="0 0 24 24" {...S}><rect x="4" y="5" width="6" height="6" rx="1.5" /><path d="m5.5 8 1.3 1.3L9 7" /><rect x="4" y="13" width="6" height="6" rx="1.5" /><path d="M13 8h7M13 16h7" /></svg>,
  number: <svg width="18" height="18" viewBox="0 0 24 24" {...S}><path d="M9 4 7 20M17 4l-2 16M4 9h16M3 15h16" /></svg>,
  email: <svg width="18" height="18" viewBox="0 0 24 24" {...S}><rect x="3" y="5" width="18" height="14" rx="3" /><path d="m4 7 8 6 8-6" /></svg>,
  wallet: <svg width="18" height="18" viewBox="0 0 24 24" {...S}><rect x="3.5" y="6" width="17" height="13" rx="3" /><path d="M15 12.5h3M6 6l9-3 1 3" /></svg>,
  x_post: <svg width="18" height="18" viewBox="0 0 24 24" {...S}><path d="M7 17 17 7M9 7h8v8" /><rect x="3" y="3" width="18" height="18" rx="4" /></svg>,
};

export type FieldMeta = { type: FieldType; label: string; hint: string; group: "Tasks" | "Questions"; icon: ReactNode; color: string; defaultLabel: string; taskUrl?: "telegram" | "x" | "discord"; answerLabel?: string; placeholder?: string };
export const FIELD_TYPES: FieldMeta[] = [
  { type: "telegram", label: "Join Telegram", hint: "Show your Telegram link, ask for their @username", group: "Tasks", icon: <TelegramIcon size={18} />, color: "from-sky-400/25 to-sky-500/5 text-sky-300", defaultLabel: "Join our Telegram community", taskUrl: "telegram", answerLabel: "Your Telegram username", placeholder: "@username or t.me link" },
  { type: "x_follow", label: "Follow on X", hint: "Show your X profile, ask for their X username", group: "Tasks", icon: <XIcon size={16} />, color: "from-white/20 to-white/5 text-white", defaultLabel: "Follow us on X", taskUrl: "x", answerLabel: "Your X username", placeholder: "@username or x.com link" },
  { type: "discord", label: "Join Discord", hint: "Show your Discord invite, ask for their username", group: "Tasks", icon: <DiscordIcon size={18} />, color: "from-indigo-400/25 to-indigo-500/5 text-indigo-300", defaultLabel: "Join our Discord server", taskUrl: "discord", answerLabel: "Your Discord username", placeholder: "username" },
  { type: "x_post", label: "X post link", hint: "Ask for a link to a post, quote or thread", group: "Tasks", icon: I.x_post, color: "from-pink/25 to-pink/5 text-pink", defaultLabel: "Share the link to your post about us", placeholder: "https://x.com/…/status/…" },
  { type: "short", label: "Short answer", hint: "One line of text", group: "Questions", icon: I.short, color: "from-pink/25 to-pink/5 text-pink", defaultLabel: "", placeholder: "Your answer" },
  { type: "paragraph", label: "Paragraph", hint: "Long-form answer", group: "Questions", icon: I.paragraph, color: "from-pink/25 to-pink/5 text-pink", defaultLabel: "Why are you a great fit?", placeholder: "Write your answer…" },
  { type: "link", label: "Link", hint: "Portfolio, website or any URL", group: "Questions", icon: I.link, color: "from-fuchsia-400/25 to-fuchsia-500/5 text-fuchsia-300", defaultLabel: "Portfolio or previous work", placeholder: "https://" },
  { type: "choice", label: "Multiple choice", hint: "Pick one option (buttons)", group: "Questions", icon: I.choice, color: "from-violet-400/25 to-violet-500/5 text-violet-300", defaultLabel: "" },
  { type: "multi", label: "Checkboxes", hint: "Pick several options (buttons)", group: "Questions", icon: I.multi, color: "from-violet-400/25 to-violet-500/5 text-violet-300", defaultLabel: "" },
  { type: "wallet", label: "Wallet address", hint: "A Solana address (validated)", group: "Questions", icon: I.wallet, color: "from-emerald-400/25 to-emerald-500/5 text-emerald-300", defaultLabel: "Your Solana wallet address", placeholder: "Solana address" },
  { type: "email", label: "Email", hint: "A valid email address", group: "Questions", icon: I.email, color: "from-amber-300/25 to-amber-400/5 text-amber-200", defaultLabel: "Your email address", placeholder: "name@example.com" },
  { type: "number", label: "Number", hint: "A numeric answer", group: "Questions", icon: I.number, color: "from-amber-300/25 to-amber-400/5 text-amber-200", defaultLabel: "", placeholder: "0" },
];
export const metaOf = (t: FieldType) => FIELD_TYPES.find((m) => m.type === t) || FIELD_TYPES[4];
export const isTask = (t: FieldType) => metaOf(t).group === "Tasks";

/** Default task link for a field type, from the project's socials. */
export function defaultTaskUrl(t: FieldType, author?: ShineUser | null) {
  const p = author?.project;
  if (t === "telegram") return socialUrl("telegram", p?.telegram || author?.telegram);
  if (t === "x_follow") return socialUrl("x", p?.x || author?.xHandle);
  if (t === "discord") return socialUrl("discord", p?.discord || author?.discord);
  return "";
}

export function TypeBadge({ type, size = 40 }: { type: FieldType; size?: number }) {
  const m = metaOf(type);
  return <span className={`grid shrink-0 place-items-center rounded-2xl bg-gradient-to-br ring-1 ring-white/10 ${m.color}`} style={{ width: size, height: size }}>{m.icon}</span>;
}
