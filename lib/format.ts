import type { Timestamp } from "firebase/firestore";
export const short = (a?: string, n = 4) => (a ? `${a.slice(0, n)}…${a.slice(-n)}` : "");
export const toDate = (t?: Timestamp | Date | string | null | any): Date | null =>
  !t ? null : typeof t.toDate === "function" ? t.toDate() : t instanceof Date ? t : typeof t === "string" && !isNaN(Date.parse(t)) ? new Date(t) : null;
export function timeAgo(t?: Timestamp | Date | null) {
  const d = t instanceof Date ? t : toDate(t as Timestamp);
  if (!d) return "just now";
  const s = Math.max(0, (Date.now() - d.getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 604800) return `${Math.floor(s / 86400)}d`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: d.getFullYear() === new Date().getFullYear() ? undefined : "numeric" });
}
export const fmtSol = (n: number, max = 6) => n.toLocaleString(undefined, { maximumFractionDigits: max, minimumFractionDigits: 0 });
export const fmtUsd = (n: number) => n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 });
export const cleanHandle = (s: string) => s.trim().replace(/^https?:\/\/(www\.)?(x|twitter)\.com\//i, "").replace(/^https?:\/\/t\.me\//i, "").replace(/^@/, "").replace(/[/?#].*$/, "");
export const fmtNum = (n?: number | null) => (n == null ? "" : n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}K` : String(n));
export const isPostOpen = (p: { status: string; endsAt?: Timestamp | null }) => {
  if (p.status !== "open") return false;
  const e = toDate(p.endsAt ?? null);
  return !e || e.getTime() > Date.now();
};
