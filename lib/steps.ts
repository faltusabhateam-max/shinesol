// Project-defined "Apply steps" — shared by composer, applicant flow and review.
export type StepType = "message" | "task" | "short" | "long" | "link" | "choice" | "username" | "wallet" | "proof" | "file";
export type Platform = "x" | "telegram" | "discord";
export type ApplyStep = {
  id: string; type: StepType; title: string; text?: string;
  required: boolean; requiresLink?: boolean;
  options?: string[]; multi?: boolean; platform?: Platform;
  button?: { label: string; url: string } | null;
};
export const STEP_TYPES: { type: StepType; label: string; hint: string; icon: string }[] = [
  { type: "message", label: "Message", hint: "Instruction or info only", icon: "message" },
  { type: "task", label: "Task", hint: "Join Telegram, follow X, visit a link", icon: "task" },
  { type: "short", label: "Short answer", hint: "One line of text", icon: "short" },
  { type: "long", label: "Long answer", hint: "A paragraph", icon: "long" },
  { type: "link", label: "Link submission", hint: "Portfolio, tweet, video…", icon: "link" },
  { type: "choice", label: "Choice", hint: "Pick from options", icon: "choice" },
  { type: "username", label: "Username", hint: "X, Telegram or Discord", icon: "username" },
  { type: "wallet", label: "Wallet address", hint: "A Solana address", icon: "wallet" },
  { type: "proof", label: "Proof link", hint: "Tx or post link as proof", icon: "proof" },
  { type: "file", label: "Image proof", hint: "Screenshot upload", icon: "file" },
];
export const stepMeta = (t: StepType) => STEP_TYPES.find((s) => s.type === t)!;
export const sid = () => Math.random().toString(36).slice(2, 9);
export function newStep(type: StepType): ApplyStep {
  const base: ApplyStep = { id: sid(), type, title: "", text: "", required: type !== "message", button: null };
  if (type === "task") return { ...base, title: "Join our Telegram", text: "Join the community, then come back and tap Done.", button: { label: "Open Telegram", url: "https://t.me/" }, requiresLink: false };
  if (type === "choice") return { ...base, title: "Which role fits you best?", options: ["Content creator", "Community moderator"] };
  if (type === "username") return { ...base, title: "Your X username", platform: "x" };
  if (type === "message") return { ...base, title: "Welcome", text: "Here's what we're looking for…", required: false };
  if (type === "file") return { ...base, title: "Upload a screenshot", text: "Show us proof you completed the task." };
  return { ...base, title: stepMeta(type).label };
}
/** Does this step collect an answer? */
export const collects = (s: ApplyStep) => s.type !== "message";
export const answerKey = (s: ApplyStep) => `s_${s.id}`;
const URL_RE = /^https?:\/\/[^\s]+\.[^\s]+/i;
export const isUrl = (v: string) => URL_RE.test(v.trim());
export function normalizeUsername(v: string, p: Platform = "x") {
  let s = v.trim();
  const m = s.match(/(?:x\.com|twitter\.com)\/(?:#!\/)?@?([A-Za-z0-9_]{1,15})/i) || s.match(/t\.me\/@?([A-Za-z0-9_]{3,32})/i) || s.match(/discord(?:app)?\.com\/users\/(\d+)/i);
  if (m) s = m[1];
  s = s.replace(/^@/, "");
  return p === "discord" ? s : s ? `@${s}` : "";
}
export function validateAnswer(s: ApplyStep, v: string): string | null {
  const val = (v || "").trim();
  if (!val) return s.required ? "This step is required." : null;
  if ((s.type === "link" || s.type === "proof" || (s.type === "task" && s.requiresLink)) && !isUrl(val)) return "Enter a full link starting with https://";
  if (s.type === "wallet" && !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(val)) return "Enter a valid Solana address.";
  return null;
}
/** Clean steps before saving. */
export function cleanSteps(steps: ApplyStep[]): ApplyStep[] {
  return steps.slice(0, 20).map((s) => {
    const out: any = { id: s.id, type: s.type, title: s.title.trim().slice(0, 120), text: (s.text || "").trim().slice(0, 1000), required: s.type === "message" ? false : !!s.required };
    if (s.type === "task" || s.type === "link" || s.type === "proof") out.requiresLink = s.type !== "task" ? true : !!s.requiresLink;
    if (s.type === "choice") { out.options = (s.options || []).map((o) => o.trim().slice(0, 80)).filter(Boolean).slice(0, 10); out.multi = !!s.multi; }
    if (s.type === "username") out.platform = s.platform || "x";
    out.button = s.button && s.button.label.trim() && isUrl(s.button.url) ? { label: s.button.label.trim().slice(0, 40), url: s.button.url.trim().slice(0, 300) } : null;
    return out;
  });
}
export function stepIssues(s: ApplyStep): string | null {
  if (!s.title.trim()) return "Add a title";
  if (s.type === "choice" && (s.options || []).filter((o) => o.trim()).length < 2) return "Add at least 2 options";
  if (s.type === "task" && !(s.button && isUrl(s.button.url))) return "Add the task link";
  if (s.button && s.button.url && !isUrl(s.button.url)) return "Button URL must start with https://";
  return null;
}
