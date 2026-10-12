import type { Metadata } from "next";
import { fetchPublicUser } from "@/lib/server-db";
import PublicProfile from "./public-profile";

type Props = { params: Promise<{ username: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const u = await fetchPublicUser(username);
  const handle = u?.username || username;
  const title = u ? `${u.name} (@${handle})` : `@${handle}`;
  const description = u?.bio ? u.bio.replace(/\*\*|\[\[|\]\]/g, "").slice(0, 160) : `View @${handle}'s profile on Shine — Web3 jobs, paid in SOL.`;
  const img = `/u/${encodeURIComponent(handle)}/opengraph-image`;
  return {
    title,
    description,
    openGraph: { title: `${title} on Shine`, description, type: "profile", url: `/u/${handle}`, images: [{ url: img, width: 1200, height: 675, alt: `@${handle} on Shine` }] },
    twitter: { card: "summary_large_image", title: `${title} on Shine`, description, images: [img] },
  };
}

export default async function Page({ params }: Props) {
  const { username } = await params;
  return <PublicProfile username={decodeURIComponent(username)} />;
}
