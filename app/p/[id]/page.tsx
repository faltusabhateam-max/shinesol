import type { Metadata } from "next";
import { fetchPublicPost } from "@/lib/server-db";
import PostPage from "./post-page";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const p = await fetchPublicPost(id);
  if (!p) return { title: "Post not found" };
  const clean = p.text.replace(/\s+/g, " ").trim();
  const isShine = p.projectName.trim().toLowerCase() === "shine";
  const title = isShine ? "Shine — New opportunity" : `${p.projectName} on Shine`;
  const description = clean.length > 180 ? `${clean.slice(0, 177)}…` : clean || `An opportunity from ${p.projectName} on Shine — Web3 jobs, paid in SOL.`;
  const img = `/p/${id}/opengraph-image`;
  return {
    title: `${p.projectName}: “${clean.slice(0, 60)}${clean.length > 60 ? "…" : ""}”`,
    description,
    openGraph: { title, description, type: "article", url: `/p/${id}`, images: [{ url: img, width: 1200, height: 630, alt: title }] },
    twitter: { card: "summary_large_image", title, description, images: [img] },
  };
}

export default async function Page({ params }: Props) {
  const { id } = await params;
  return <PostPage id={id} />;
}
