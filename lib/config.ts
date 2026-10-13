export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://shinesol.vercel.app").replace(/\/$/, "");
export const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID || "";
/** All Shine fees (withdrawals, project payments, Verified, affiliate) go to the Shine vault. */
export const FEE_WALLET = "7DgJBdwgnwPLS5LzGjmuPPcT7YC2WZJ4mmuEsaEqZcNx";
/** Withdrawals / sends from a Shine Wallet: 0.2% to the fee wallet. */
export const FEE_BPS = 20; // 0.2%
/** Project → creator payments (escrow releases + direct chat payments): 0.5% to the Shine project vault. */
export const PROJECT_FEE_BPS = 50; // 0.5%
export const PROJECT_FEE_WALLET = "7DgJBdwgnwPLS5LzGjmuPPcT7YC2WZJ4mmuEsaEqZcNx";
export const AFFILIATE_USD = 5;
export const AFFILIATE_MAX = 20;
export const SHINE_OFFICIAL_USERNAME = "ShineSol_";
export const projectFee = (lamports: number) => Math.floor((lamports * PROJECT_FEE_BPS) / 10_000);
export const MIN_WITHDRAW_USD = 2;
export const X_URL = "https://x.com/ShineSol_";
export const TG_URL = "https://t.me/shinesolweb"; // official channel
/** Official Telegram community group ("Shine Community"). */
export const TELEGRAM_GROUP_URL = "https://t.me/shinechats";
/** Treasury that receives verification payments (also the Shine vault address). */
export const VERIFY_TREASURY = "7DgJBdwgnwPLS5LzGjmuPPcT7YC2WZJ4mmuEsaEqZcNx";
export const VERIFY_PLANS = [
  { id: "3m", label: "3 months", usd: 15, months: 3 },
  { id: "6m", label: "6 months", usd: 30, months: 6, tag: "Popular" },
  { id: "1y", label: "1 year", usd: 50, months: 12, tag: "Best value" },
] as const;
export type VerifyPlanId = (typeof VERIFY_PLANS)[number]["id"];
export const AVATARS = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => `/avatars/${n}.jpg`);
export const isCustomAvatar = (a?: string | number | null) => typeof a === "string" && a.startsWith("data:image/");
export const avatarSrc = (a?: string | number | null) => {
  if (isCustomAvatar(a)) return a as string;
  const n = Number(a);
  return n >= 1 && n <= 8 ? `/avatars/${n}.jpg` : "/avatars/1.jpg";
};
export const randomAvatar = () => String(1 + Math.floor(Math.random() * 8));
export const C = {
  users: "shine_users",
  usernames: "shine_usernames",
  posts: "shine_posts",
  applications: "shine_applications",
  chats: "shine_chats",
  transactions: "shine_transactions",
  support: "shine_support",
  meta: "shine_meta",
  escrow: "shine_escrow",
  prefs: "shine_prefs",
  verify: "shine_verify",
} as const;
/* ---------- Referral program ---------- */
export const REF_TIERS = [
  { id: "t50", at: 50, kind: "badge" as const, usd: 0, label: "Permanent Verified badge" },
  { id: "t200", at: 200, kind: "usd" as const, usd: 100, label: "$100 in SOL" },
  { id: "t500", at: 500, kind: "usd" as const, usd: 300, label: "$300 in SOL" },
  { id: "t1000", at: 1000, kind: "usd" as const, usd: 500, label: "$500 in SOL" },
];
export type RefTierId = "t50" | "t200" | "t500" | "t1000";
/** A referral is "daily active" when the referred user was active on at least REF_ACTIVE_DAYS of the last REF_WINDOW_DAYS days. */
export const REF_ACTIVE_DAYS = 7;
export const REF_WINDOW_DAYS = 14;
/** A ref link can only be attached within this many hours of account creation. */
export const REF_ATTACH_HOURS = 72;
export type RefStatus = "locked" | "eligible" | "requested" | "review" | "approved" | "paid" | "rejected";
