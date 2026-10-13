import { ImageResponse } from "next/og";
import { fetchPublicUser, siteBase } from "@/lib/server-db";

export const size = { width: 1200, height: 675 };
export const contentType = "image/png";
export const alt = "Shine profile";
export const revalidate = 300;

export default async function Image({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const base = siteBase();
  const u = await fetchPublicUser(decodeURIComponent(username));
  const handle = u?.username || decodeURIComponent(username);
  const avatar = u?.avatar?.startsWith("data:image/") ? u.avatar : `${base}/avatars/${u?.avatar && /^[1-8]$/.test(u.avatar) ? u.avatar : "1"}.jpg`;
  const font = await fetch(`${base}/fonts/Poppins-SemiBold.ttf`).then((r) => (r.ok ? r.arrayBuffer() : null)).catch(() => null);
  const label = `@${handle}`;
  const fs = label.length > 18 ? 26 : label.length > 13 ? 30 : 34;
  return new ImageResponse(
    (
      <div style={{ width: 1200, height: 675, display: "flex", position: "relative", background: "#2b2b2e" }}>
        <img src={`${base}/brand/share-template.jpg`} width={1200} height={675} style={{ position: "absolute", left: 0, top: 0 }} />
        <div style={{ position: "absolute", left: 592 - 153, top: 299 - 153, width: 306, height: 306, borderRadius: 9999, border: "6px solid #ff5e8a", boxShadow: "0 0 26px 4px rgba(255,94,138,0.8)", overflow: "hidden", display: "flex", background: "#000" }}>
          <img src={avatar} width={294} height={294} style={{ width: 294, height: 294, objectFit: "cover" }} />
        </div>
        <div style={{ position: "absolute", left: 420, top: 464, width: 360, height: 52, display: "flex", alignItems: "center", justifyContent: "center", color: "#ffffff", fontSize: fs, fontFamily: font ? "Poppins" : undefined, letterSpacing: 0.5, textShadow: "0 0 18px rgba(255,94,138,0.9)" }}>
          {label}
        </div>
      </div>
    ),
    { ...size, fonts: font ? [{ name: "Poppins", data: font, weight: 600, style: "normal" }] : undefined },
  );
}
