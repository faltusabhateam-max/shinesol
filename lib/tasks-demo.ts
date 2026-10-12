import type { TaskCampaign, TaskClaim } from "./tasks";
const ago = (m: number) => new Date(Date.now() - m * 60000).toISOString();
export const DEMO_TASKS: TaskCampaign[] = [
  { id: "demo-t1", creatorUid: "p", creatorUsername: "ShineSol_", creatorName: "Shine", creatorAvatar: "/brand/star-192.png", title: "Join the Shine community & spread the word",
    description: "Help us grow Shine on Solana. Join our Telegram channel, follow us on X and repost the launch announcement. Rewards are paid in SOL right after the Shine team reviews your proof.",
    subtasks: [{ id: "a", type: "tg_channel", label: "Join Shine Channel", link: "https://t.me/ShineSol", usd: 0.5 }, { id: "b", type: "x_follow", label: "Follow @ShineSol_", link: "https://x.com/ShineSol_", usd: 0.25 }, { id: "c", type: "x_repost", label: "Repost the launch post", link: "https://x.com/ShineSol_/status/1844", usd: 0.25 }],
    rewardUsd: 1, limit: 100, totalUsd: 100, rewardLamports: 5_540_000, fundedLamports: 554_000_000, price: 180.5, status: "open", claimed: 64, approved: 51, rejected: 7, paidLamports: 282_540_000, refundedLamports: 0, createdAt: ago(42) },
  { id: "demo-t2", creatorUid: "o", creatorUsername: "orbitlabs", creatorName: "Orbit Labs", creatorAvatar: "4", title: "Orbit Labs Discord launch quest",
    description: "Join our Discord, say hi in #general and like our pinned post. First 40 creators get $2 each.",
    subtasks: [{ id: "a", type: "discord", label: "Join Orbit Discord", link: "https://discord.gg/orbit", usd: 1 }, { id: "b", type: "x_like", label: "Like the pinned post", link: "https://x.com/orbitlabs/status/1", usd: 0.5 }, { id: "c", type: "custom", label: "Say hi in #general", link: "", usd: 0.5 }],
    rewardUsd: 2, limit: 40, totalUsd: 80, rewardLamports: 11_080_000, fundedLamports: 443_200_000, price: 180.5, status: "completed", claimed: 40, approved: 38, rejected: 0, paidLamports: 0, refundedLamports: 0, createdAt: ago(300) },
  { id: "demo-t3", creatorUid: "u", creatorUsername: "memequeen", creatorName: "memequeen", creatorAvatar: "2", title: "Visit & review my Solana NFT drop",
    description: "Visit the mint page, follow me on X and leave honest feedback on the art in a reply.",
    subtasks: [{ id: "a", type: "visit", label: "Visit the mint page", link: "https://example.com/drop", usd: 0.2 }, { id: "b", type: "x_follow", label: "Follow @memequeen", link: "https://x.com/memequeen", usd: 0.3 }],
    rewardUsd: 0.5, limit: 25, totalUsd: 12.5, rewardLamports: 2_770_000, fundedLamports: 69_250_000, price: 180.5, status: "open", claimed: 9, approved: 6, rejected: 1, paidLamports: 0, refundedLamports: 0, createdAt: ago(1500) },
];
const IMG = "/media/how-it-works-poster.jpg";
export const DEMO_QUEUE: (TaskClaim & { [k: string]: any })[] = [
  { id: "demo-t1_c", taskId: "demo-t1", uid: "c", username: "Zorveny", avatar: "3", status: "submitted", taskTitle: DEMO_TASKS[0].title, rewardLamports: 5_540_000, createdAt: ago(30), submittedAt: ago(12),
    proofs: { a: { text: "@zorveny", auto: true }, b: { text: "@zorveny", image: IMG }, c: { text: "https://x.com/zorveny/status/1845" } } },
  { id: "demo-t1_d", taskId: "demo-t1", uid: "d", username: "solwriter", avatar: "5", status: "submitted", taskTitle: DEMO_TASKS[0].title, rewardLamports: 5_540_000, createdAt: ago(25), submittedAt: ago(8),
    proofs: { a: { text: "@solwriter" }, b: { text: "@solwriter" }, c: { image: IMG } } },
];
