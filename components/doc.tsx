import type { ReactNode } from "react";
export function DocHeader({ kicker, title, sub }: { kicker: string; title: string; sub?: ReactNode }) {
  return (
    <header className="mb-8 pt-2">
      <p className="text-xs font-semibold uppercase tracking-[.2em] text-pink">{kicker}</p>
      <h1 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">{title}</h1>
      {sub && <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-white/60">{sub}</p>}
    </header>
  );
}
export function Prose({ children }: { children: ReactNode }) {
  return <div className="space-y-4 text-[15px] leading-7 text-white/70 [&_h2]:mt-8 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-white [&_a]:text-pink [&_a]:underline [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5 [&_b]:text-white">{children}</div>;
}
export const NoToken = () => (
  <div className="mb-6 flex items-start gap-3 rounded-2xl bg-pink/[.07] p-4 ring-1 ring-pink/30">
    <span className="text-xl">⚠️</span>
    <p className="text-sm text-white/75"><b className="text-pink">Shine has no token yet.</b> Beware of scams — any “Shine token” you see is not official. Shine will only ever announce through <a className="text-pink underline" href="https://x.com/ShineSol_">@ShineSol_</a> and our official Telegram.</p>
  </div>
);
