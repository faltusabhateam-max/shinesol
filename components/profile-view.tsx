"use client";
import { motion } from "framer-motion";
import type { ReactNode } from "react";
import type { ShineUser } from "@/lib/types";
import { Avatar } from "./ui";
import { RichText } from "./bio";
import { SocialRow } from "./social";
import { displayName, socialsOf } from "@/lib/db";
import { ICON } from "./icons";
import { useToast } from "./toast";
import { SITE_URL } from "@/lib/config";
import { VerifiedBadge } from "./flags";

export function ShareProfileButton({ username, className = "" }: { username: string; className?: string }) {
  const toast = useToast();
  const share = async () => {
    const url = `${typeof window !== "undefined" ? window.location.origin : SITE_URL}/u/${username}`;
    try {
      if (navigator.share && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)) {
        await navigator.share({ title: `@${username} on Shine`, text: `Check out @${username} on Shine`, url });
        return;
      }
    } catch (e: any) { if (e?.name === "AbortError") return; }
    try { await navigator.clipboard.writeText(url); toast("Profile link copied", "ok"); } catch { toast(url); }
  };
  return (
    <button onClick={share} className={`glass inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold hover:border-pink/50 ${className}`}>
      {ICON.share} Share profile
    </button>
  );
}

export function ProfileView({ user, actions }: { user: ShineUser; actions?: ReactNode }) {
  const name = displayName(user);
  return (
    <div className="-mx-4 -mt-4 sm:mx-0 sm:mt-0">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative aspect-[3/1] w-full overflow-hidden sm:rounded-3xl">
        <img src="/brand/banner.jpg" alt="" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/40" />
      </motion.div>
      <div className="px-4 sm:px-2">
        <div className="flex items-end justify-between">
          <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.1 }}
            className="relative z-10 -mt-12 rounded-full bg-[#2b2b2e] p-1 sm:-mt-16">
            <Avatar avatar={user.avatar} size={104} ring className="sm:!h-[128px] sm:!w-[128px]" />
          </motion.div>
          <div className="flex gap-2 pt-3">{actions}</div>
        </div>
        <div className="mt-3">
          <h1 className="flex min-w-0 items-center gap-2 font-display text-2xl font-bold">
            <span className="min-w-0 truncate">{name}</span>
            <VerifiedBadge uid={user.uid} size={22} />
            {user.role === "project" && <span className="rounded-full bg-pink/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-pink ring-1 ring-pink/40">Project</span>}
          </h1>
          <p className="truncate text-white/50">@{user.username}</p>
        </div>
        <div className="mt-4"><SocialRow s={socialsOf(user)} /></div>
        {user.bio?.trim() && <RichText text={user.bio} className="mt-5 text-[0.95rem] text-white/80" />}
      </div>
    </div>
  );
}
