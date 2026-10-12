"use client";
import { useEffect, useState } from "react";
import { getUserByUsername } from "@/lib/db";
import type { ShineUser } from "@/lib/types";
import { ProfileView, ShareProfileButton } from "@/components/profile-view";
import { BackLink, Empty, FullLoader } from "@/components/ui";
import { useFlags, VerifiedBadge } from "@/components/flags";
import { useSession } from "@/components/providers";
import { useApi } from "@/lib/client-api";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui";
import { useToast } from "@/components/toast";

/** Verified perk: message a project directly, without applying or being hired. */
function DmButton({ project }: { project: ShineUser }) {
  const { uid, authenticated, login } = useSession();
  const { isVerified } = useFlags();
  const api = useApi();
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  if (project.role !== "project" || project.uid === uid) return null;
  if (!authenticated) return <Button size="sm" variant="glass" className="!px-3 !py-2" onClick={login}>Message</Button>;
  if (!uid || !isVerified(uid)) return <Link href="/verify"><Button size="sm" variant="glass" className="!px-3 !py-2"><VerifiedBadge force size={13} /> Message</Button></Link>;
  return <Button size="sm" className="!px-3 !py-2" loading={busy} onClick={async () => { setBusy(true); try { const r = await api<{ id: string }>("/api/dm", { projectUid: project.uid }); router.push(`/chat/${r.id}`); } catch (e: any) { toast(e.message, "err"); setBusy(false); } }}>Message</Button>;
}

export default function PublicProfile({ username }: { username: string }) {
  const { deactivated } = useFlags();
  const [u, setU] = useState<ShineUser | null | undefined>(undefined);
  useEffect(() => { getUserByUsername(username).then(setU).catch(() => setU(null)); }, [username]);
  if (u === undefined) return <FullLoader />;
  if (!u) return <><BackLink href="/events" /><Empty title="Profile not found" text={`There is no Shine profile for @${username}.`} /></>;
  if (deactivated.has(u.uid)) return <><BackLink href="/events" /><Empty title="Account unavailable" text={`@${u.username} has been deactivated and is not currently visible on Shine.`} /></>;
  return <ProfileView user={u} actions={<div className="flex gap-2"><DmButton project={u} /><ShareProfileButton username={u.username} className="!px-3 !py-2" /></div>} />;
}
