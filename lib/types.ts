import type { Timestamp } from "firebase/firestore";

export type ProjectInfo = {
  name: string;
  x?: string;
  telegram?: string;
  discord?: string;
  xFollowers?: number | null;
  telegramMembers?: number | null;
  discordMembers?: number | null;
};

export type ShineUser = {
  uid: string;
  username: string; // display (X handle casing)
  usernameLower: string;
  xHandle: string;
  telegram?: string;
  discord?: string;
  avatar: string;
  bio: string;
  wallet?: string;
  role: "user" | "project";
  project?: ProjectInfo | null;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

export type FieldType = "short" | "paragraph" | "link" | "choice" | "multi" | "number" | "email" | "telegram" | "x_follow" | "discord" | "wallet" | "x_post";
export type FormField = {
  id: string;
  label: string;
  type: FieldType;
  required: boolean;
  options?: string[];
  placeholder?: string;
  url?: string; // task link (Telegram group, X profile, Discord invite)
  description?: string;
};

export type Post = {
  id: string;
  authorUid: string;
  authorUsername: string;
  authorAvatar: string;
  projectName: string;
  text: string;
  image?: string | null;
  imageRatio?: number | null;
  form: FormField[];
  applicants?: number;
  steps?: import("./steps").ApplyStep[];
  likes?: number;
  replies?: number;
  shares?: number;
  status: "open" | "closed";
  endsAt?: Timestamp | null;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

export type AppStatus = "pending" | "approved" | "rejected";
export type Application = {
  id: string;
  postId: string;
  projectUid: string;
  projectName: string;
  applicantUid: string;
  applicantUsername: string;
  applicantAvatar: string;
  answers: Record<string, string | string[]>;
  wallet: string;
  signature: string;
  signedMessage: string;
  postExcerpt: string;
  status: AppStatus;
  createdAt?: Timestamp;
  decidedAt?: Timestamp | null;
};

export type Chat = {
  id: string;
  members: string[];
  projectUid: string;
  applicantUid: string;
  projectName: string;
  projectAvatar: string;
  applicantUsername: string;
  applicantAvatar: string;
  postId: string;
  postExcerpt: string;
  lastMessage?: string;
  updatedAt?: Timestamp;
};

export type MessageType = "text" | "image" | "wallet_request" | "wallet_share" | "payment";
export type Message = {
  id: string;
  senderUid: string;
  type: MessageType;
  text?: string;
  image?: string;
  wallet?: string;
  amount?: number;
  signature?: string;
  createdAt?: Timestamp;
};

export type SupportThread = {
  uid: string;
  username: string;
  name: string;
  avatar: string;
  role: "user" | "project";
  lastMessage?: string;
  lastFrom?: "user" | "support";
  unreadForSupport?: boolean;
  unreadForUser?: boolean;
  updatedAt?: Timestamp;
  createdAt?: Timestamp;
};
export type SupportRequestKind = "x" | "project" | "telegram" | "wallet" | "custom";
export type SupportRequest = { kind: SupportRequestKind; title: string; fields: { key: string; label: string; placeholder?: string; multiline?: boolean }[] };
export type SupportMessage = {
  id: string;
  from: "user" | "support";
  senderUid: string;
  type: "text" | "image" | "request" | "report";
  text?: string;
  image?: string;
  request?: SupportRequest;
  response?: Record<string, string> | null;
  respondedAt?: Timestamp | null;
  report?: { projectUid: string; projectName: string; projectUsername: string; details: string };
  createdAt?: Timestamp;
};
