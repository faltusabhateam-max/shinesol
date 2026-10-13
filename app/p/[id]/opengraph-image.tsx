import { ImageResponse } from "next/og";
import { fetchPublicPost, siteBase } from "@/lib/server-db";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Shine post";

export default async function OG({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await fetchPublicPost(id);
  const base = siteBase();
  // Post image when present, otherwise the default Shine OG image.
  if (p?.image) {
    return new ImageResponse(
      (
        <div style={{ width: 1200, height: 630, display: "flex", position: "relative", background: "#2b2b2e" }}>
          <img src={p.image} width={1200} height={630} style={{ position: "absolute", left: 0, top: 0, width: 1200, height: 630, objectFit: "cover", filter: "blur(30px)", opacity: 0.45 }} />
          <img src={p.image} width={1200} height={630} style={{ position: "absolute", left: 0, top: 0, width: 1200, height: 630, objectFit: "contain" }} />
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 120, display: "flex", alignItems: "center", padding: "0 40px", background: "linear-gradient(to top, rgba(5,3,7,.95), rgba(5,3,7,0))" }}>
            <img src={`${base}/brand/star-192.png`} width={48} height={48} />
            <div style={{ marginLeft: 16, color: "#fff", fontSize: 34, fontWeight: 700, display: "flex" }}>{p.projectName}{p.projectName.trim().toLowerCase() !== "shine" && <span style={{ color: "#ff5e8a", marginLeft: 14 }}>· on Shine</span>}</div>
          </div>
        </div>
      ),
      size,
    );
  }
  return new ImageResponse(<img src={`${base}/og.jpg`} width={1200} height={630} style={{ width: 1200, height: 630, objectFit: "cover" }} />, size);
}
