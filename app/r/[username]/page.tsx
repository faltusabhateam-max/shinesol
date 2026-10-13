import { redirect } from "next/navigation";
export default async function RefRedirect({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const u = decodeURIComponent(username).replace(/^@/, "");
  redirect(/^[A-Za-z0-9_]{1,15}$/.test(u) ? `/?ref=${u}` : "/");
}
