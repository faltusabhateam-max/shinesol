// Normalizes pasted social links into handles.
const X_RESERVED = new Set(["i", "intent", "home", "share", "search", "explore", "hashtag", "settings", "messages", "notifications", "compose"]);
const X_URL = /(?:https?:\/\/)?(?:www\.|mobile\.)?(?:x|twitter)\.com\/@?([A-Za-z0-9_]{1,15})(?:\/status(?:es)?\/\d+)?[^\s]*/gi;
const TG_URL = /(?:https?:\/\/)?(?:www\.)?(?:t|telegram)\.me\/(?:s\/)?@?([A-Za-z0-9_]{4,32})[^\s]*/gi;

/** Replaces X / Telegram profile links anywhere in the text with @username. */
export function normalizeLinks(v: string): string {
  return v
    .replace(X_URL, (m, u) => (X_RESERVED.has(u.toLowerCase()) ? m : `@${u}`))
    .replace(TG_URL, (m, u) => (u.toLowerCase() === "joinchat" || u.startsWith("+") ? m : `@${u}`));
}
/** For handle fields: converts a link or bare name into @handle. */
export function toHandle(v: string, kind: "x" | "telegram"): string {
  const t = normalizeLinks(v.trim());
  if (!t) return "";
  const bare = t.replace(/^@+/, "");
  const re = kind === "x" ? /^[A-Za-z0-9_]{1,15}$/ : /^[A-Za-z0-9_]{1,32}$/;
  return re.test(bare) ? `@${bare}` : t;
}
export const isXHandle = (v: string) => /^@[A-Za-z0-9_]{1,15}$/.test(v.trim());
export const isTgHandle = (v: string) => /^@[A-Za-z0-9_]{4,32}$/.test(v.trim());
/** Builds a full URL for a project's social value (handle or link). */
export function socialUrl(kind: "x" | "telegram" | "discord", v?: string | null) {
  if (!v) return "";
  const t = v.trim();
  if (/^https?:\/\//i.test(t)) return t;
  if (kind === "x") return `https://x.com/${t.replace(/^@/, "")}`;
  if (kind === "telegram") return `https://t.me/${t.replace(/^@/, "")}`;
  return /^(discord\.gg|discord\.com)\//i.test(t) ? `https://${t}` : `https://discord.gg/${t}`;
}
