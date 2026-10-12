"use client";
import { DiscordIcon, TelegramIcon, XIcon } from "./icons";

export type Socials = { x?: string; telegram?: string; discord?: string };
export const xLink = (h: string) => `https://x.com/${h}`;
export const tgLink = (h: string) => `https://t.me/${h}`;
export const discordLink = (h: string) => (/^https?:\/\//.test(h) ? h : /^(discord\.gg|discord\.com)\//.test(h) ? `https://${h}` : `https://discord.com/users/${h}`);

export function SocialRow({ s, size = "md" }: { s: Socials; size?: "sm" | "md" }) {
  const items = [
    s.x && { key: "x", href: xLink(s.x), label: `@${s.x}`, icon: <XIcon size={15} /> },
    s.telegram && { key: "tg", href: tgLink(s.telegram), label: `@${s.telegram}`, icon: <TelegramIcon size={16} className="text-[#2aabee]" /> },
    s.discord && { key: "dc", href: discordLink(s.discord), label: s.discord.replace(/^https?:\/\//, ""), icon: <DiscordIcon size={16} className="text-[#8c9eff]" /> },
  ].filter(Boolean) as { key: string; href: string; label: string; icon: React.ReactNode }[];
  if (!items.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((i) => (
        <a key={i.key} href={i.href} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
          className={`glass inline-flex items-center gap-1.5 rounded-full font-medium text-white/85 transition hover:border-pink/50 hover:text-white ${size === "sm" ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-sm"}`}>
          {i.icon}<span className="max-w-[12rem] truncate">{i.label}</span>
        </a>
      ))}
    </div>
  );
}

export function SocialIcons({ s }: { s: Socials }) {
  return (
    <div className="flex items-center gap-1.5">
      {s.x && <a href={xLink(s.x)} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="rounded-full p-2 text-white/70 hover:bg-white/10 hover:text-white" aria-label="X"><XIcon size={15} /></a>}
      {s.telegram && <a href={tgLink(s.telegram)} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="rounded-full p-2 text-[#2aabee] hover:bg-white/10" aria-label="Telegram"><TelegramIcon size={16} /></a>}
      {s.discord && <a href={discordLink(s.discord)} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="rounded-full p-2 text-[#8c9eff] hover:bg-white/10" aria-label="Discord"><DiscordIcon size={16} /></a>}
    </div>
  );
}
