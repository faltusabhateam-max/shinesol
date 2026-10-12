export type SubTaskType = "tg_channel" | "tg_group" | "x_follow" | "x_repost" | "x_like" | "discord" | "visit" | "custom";
export type SubTask = { id: string; type: SubTaskType; label: string; link: string; usd: number };
export type TaskCampaign = {
  id: string; creatorUid: string; creatorUsername: string; creatorName: string; creatorAvatar: string;
  title: string; description: string; subtasks: SubTask[]; rewardUsd: number; limit: number; totalUsd: number;
  rewardLamports: number; fundedLamports: number; price: number;
  status: "funding" | "open" | "completed" | "cancelled"; claimed: number; approved: number; rejected: number; submitted?: number;
  paidLamports: number; refundedLamports: number; createdAt: any; fundingTx?: string;
};
export type ClaimStatus = "reserved" | "submitted" | "changes" | "approved" | "rejected";
export type TaskProof = { text?: string; image?: string; auto?: boolean };
export type TaskClaim = {
  id: string; taskId: string; uid: string; username: string; avatar?: string; status: ClaimStatus; proofs: Record<string, TaskProof>;
  note?: string; payoutTx?: string; createdAt: any; submittedAt?: any; reviewedAt?: any; taskTitle?: string; rewardLamports?: number;
};
export const SUBTASK_TYPES: { type: SubTaskType; label: string; icon: string; hint: string; proof: string }[] = [
  { type: "tg_channel", label: "Join Telegram channel", icon: "telegram", hint: "https://t.me/yourchannel", proof: "Your Telegram @username" },
  { type: "tg_group", label: "Join Telegram group", icon: "telegram", hint: "https://t.me/yourgroup", proof: "Your Telegram @username" },
  { type: "x_follow", label: "Follow on X", icon: "username", hint: "https://x.com/yourproject", proof: "Your X @username + screenshot" },
  { type: "x_repost", label: "Retweet / Repost", icon: "repeat", hint: "https://x.com/…/status/…", proof: "Link to your repost or screenshot" },
  { type: "x_like", label: "Like post", icon: "heart", hint: "https://x.com/…/status/…", proof: "Screenshot of the liked post" },
  { type: "discord", label: "Join Discord", icon: "message", hint: "https://discord.gg/…", proof: "Your Discord username + screenshot" },
  { type: "visit", label: "Visit link", icon: "link", hint: "https://…", proof: "Screenshot or link" },
  { type: "custom", label: "Custom task", icon: "task", hint: "https://… (optional)", proof: "Proof as described" },
];
export const TASK_MIN_USD = 10;
export const MAX_SUBTASKS = 10;
export const MAX_LIMIT = 10000;
export const totalOf = (subs: { usd: number }[], limit: number) => Math.round(subs.reduce((a, s) => a + (Number(s.usd) || 0), 0) * limit * 100) / 100;
export function taskIssues(t: { title: string; description: string; subtasks: SubTask[]; limit: number }) {
  const out: string[] = [];
  if (t.title.trim().length < 4) out.push("Add a title (at least 4 characters).");
  if (t.description.trim().length < 10) out.push("Add a short description.");
  if (!t.subtasks.length) out.push("Add at least one sub-task.");
  t.subtasks.forEach((s, i) => {
    if (!(s.usd >= 0.1)) out.push(`Sub-task ${i + 1}: reward must be at least $0.10.`);
    if (s.type !== "custom" && !/^https?:\/\/\S+\.\S+/.test(s.link)) out.push(`Sub-task ${i + 1}: add a valid link.`);
    if (s.type === "custom" && s.label.trim().length < 3) out.push(`Sub-task ${i + 1}: describe the custom task.`);
  });
  if (!(t.limit >= 1 && t.limit <= MAX_LIMIT && Number.isInteger(t.limit))) out.push(`Claim limit must be 1–${MAX_LIMIT}.`);
  if (totalOf(t.subtasks, t.limit) < TASK_MIN_USD) out.push(`Minimum campaign total is $${TASK_MIN_USD}.`);
  return out;
}
export const subLabel = (s: SubTask) => s.label?.trim() || SUBTASK_TYPES.find((x) => x.type === s.type)?.label || "Task";
