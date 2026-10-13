"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { useSession } from "@/components/providers";
import { Avatar, Button, Card, FullLoader, Sheet, StatusPill } from "@/components/ui";
import { BioEditor } from "@/components/bio";
import { ProfileView, ShareProfileButton } from "@/components/profile-view";
import { StatusOverlay, friendlyError } from "@/components/status";
import { ICON } from "@/components/icons";
import { AVATARS, C, isCustomAvatar, randomAvatar } from "@/lib/config";
import { AvatarCropper } from "@/components/avatar-cropper";
import { loadImageFile } from "@/lib/image";
import { useRef } from "react";
import { saveProfile, switchToProject, updateProject, USERNAME_RE } from "@/lib/db";
import { cleanHandle, timeAgo } from "@/lib/format";
import { fb } from "@/lib/firebase";
import type { Application, ProjectInfo, ShineUser } from "@/lib/types";
import { useToast } from "@/components/toast";
import { SignInGate, SessionGate } from "@/components/gate";
import { useFlags, VerifiedBadge } from "@/components/flags";
import { AffiliateManager, VerifyPill } from "@/components/affiliate";

export default function ProfilePage() {
  const s = useSession();
  const [editing, setEditing] = useState(false);
  const [projOpen, setProjOpen] = useState(false);
  const [status, setStatus] = useState<{ kind: "success" | "failed" | "denied"; title: string; msg?: string } | null>(null);

  if (!s.ready) return <FullLoader />;
  if (!s.authenticated) return <SignInGate />;
  if (s.authError) return <Card className="p-6 text-center"><p className="text-red-200">{s.authError}</p><Button className="mt-4" onClick={() => location.reload()}>Try again</Button></Card>;
  if (!s.fbReady || !s.profileLoaded) return <FullLoader label="Securing your session…" />;

  const showForm = editing || !s.profile;
  return (
    <>
      {showForm ? (
        <ProfileForm existing={s.profile} uid={s.uid!} wallet={s.address}
          onCancel={s.profile ? () => setEditing(false) : undefined}
          onSaved={(first) => { setEditing(false); setStatus({ kind: "success", title: first ? "Welcome to Shine" : "Profile updated", msg: first ? "Your profile is live. Start exploring opportunities in Events." : "Your changes have been saved." }); }}
          onError={(e) => setStatus({ kind: "failed", title: "Couldn't save profile", msg: friendlyError(e) })} />
      ) : (
        <>

          <ProfileView user={s.profile!} actions={<div className="flex flex-wrap items-center justify-end gap-2"><Button variant="glass" size="sm" onClick={() => setEditing(true)}>{ICON.edit} Edit profile</Button><VerifyPill uid={s.uid!} /></div>} />
          <div className="mt-6 flex flex-wrap gap-2">
            <ShareProfileButton username={s.profile!.username} />
            {s.profile!.role === "user" ? (
              <Button onClick={() => setProjOpen(true)}>Switch to Project</Button>
            ) : (
              <Button variant="glass" onClick={() => setProjOpen(true)}>{ICON.edit} Project details</Button>
            )}
          </div>
          {s.profile!.role === "project" && <AffiliateManager uid={s.uid!} />}
          {s.profile!.role === "project" && <ProjectApplicants uid={s.uid!} />}
        </>
      )}
      <ProjectSheet open={projOpen} onClose={() => setProjOpen(false)} user={s.profile}
        onDone={(first) => { setProjOpen(false); setStatus({ kind: "success", title: first ? "You're now a Project" : "Project updated", msg: first ? "Create posts in Events and review applicants in the Review tab." : "Your project details have been saved." }); }}
        onError={(e) => setStatus({ kind: "failed", title: "Couldn't update project", msg: friendlyError(e) })} />
      <StatusOverlay kind={status?.kind ?? null} title={status?.title} message={status?.msg} onClose={() => setStatus(null)} />
    </>
  );
}

function ProfileForm({ existing, uid, wallet, onSaved, onCancel, onError }: { existing: ShineUser | null; uid: string; wallet: string | null; onSaved: (first: boolean) => void; onCancel?: () => void; onError: (e: any) => void }) {
  const [x, setX] = useState(existing?.xHandle || "");
  const [tg, setTg] = useState(existing?.telegram || "");
  const [dc, setDc] = useState(existing?.discord || "");
  const [avatar, setAvatar] = useState(existing?.avatar || "");
  const [bio, setBio] = useState(existing?.bio || "");
  const [busy, setBusy] = useState(false);
  const [cropImg, setCropImg] = useState<HTMLImageElement | null>(null);
  const [custom, setCustom] = useState<string | null>(isCustomAvatar(existing?.avatar) ? existing!.avatar : null);
  const fileRef = useRef<HTMLInputElement>(null);
  const toast = useToast();
  useEffect(() => { if (!avatar) setAvatar(randomAvatar()); }, [avatar]);
  const handle = cleanHandle(x);
  const valid = USERNAME_RE.test(handle);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setBusy(true);
    try {
      await saveProfile(uid, { xHandle: handle, telegram: cleanHandle(tg), discord: dc.trim(), avatar, bio, wallet }, existing);
      onSaved(!existing);
    } catch (err) { onError(err); } finally { setBusy(false); }
  };
  return (
    <form onSubmit={submit} className="space-y-5">
      <div>
        <h1 className="font-display text-3xl font-bold">{existing ? "Edit profile" : "Set up your profile"}</h1>
        <p className="mt-1 text-sm text-white/55">Your Shine username is your X username. You can edit everything later.</p>
      </div>
      <Card className="p-5">
        <span className="label">Profile photo</span>
        <div className="mb-4 flex items-center gap-4">
          <Avatar avatar={avatar} size={72} ring />
          <div className="flex flex-wrap gap-2">
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ""; if (!f) return; try { setCropImg(await loadImageFile(f)); } catch (err) { toast(friendlyError(err), "err"); } }} />
            <Button type="button" size="sm" variant="glass" onClick={() => fileRef.current?.click()}>{ICON.image} Upload from gallery</Button>
            {custom && avatar !== custom && <Button type="button" size="sm" variant="ghost" onClick={() => setAvatar(custom)}>Use my photo</Button>}
          </div>
        </div>
        <p className="mb-2 text-xs text-white/45">Or choose one of the Shine avatars</p>
        <div className="grid grid-cols-4 gap-3 sm:grid-cols-8">
          {AVATARS.map((_, i) => {
            const id = String(i + 1); const on = avatar === id;
            return (
              <motion.button type="button" key={id} onClick={() => setAvatar(id)} whileTap={{ scale: 0.9 }} className="relative rounded-full" aria-label={`Avatar ${id}`}>
                <Avatar avatar={id} size={64} className={`!h-auto !w-full aspect-square transition ${on ? "" : "opacity-60 hover:opacity-100"}`} />
                {on && <motion.span layoutId="avatar-ring" className="absolute -inset-1 rounded-full ring-2 ring-pink shadow-[var(--raise-sm)]" />}
              </motion.button>
            );
          })}
        </div>
        <AvatarCropper img={cropImg} onCancel={() => setCropImg(null)} onDone={(url) => { setCustom(url); setAvatar(url); setCropImg(null); }} />
      </Card>
      <Card className="space-y-4 p-5">
        <div>
          <label className="label" htmlFor="x">X username <span className="text-pink">*</span></label>
          <div className="relative"><span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/40">@</span>
            <input id="x" className="input !pl-8" value={x} onChange={(e) => setX(e.target.value)} placeholder="yourhandle" autoCapitalize="off" autoCorrect="off" required /></div>
          <p className={`mt-1.5 text-xs ${x && !valid ? "text-red-300" : "text-white/45"}`}>
            {x && !valid ? "Use letters, numbers and underscores only (max 15)." : <>Shine username: <span className="font-semibold text-white">{handle ? `@${handle}` : "—"}</span></>}
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="tg">Telegram username</label>
            <div className="relative"><span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/40">@</span>
              <input id="tg" className="input !pl-8" value={tg} onChange={(e) => setTg(e.target.value)} placeholder="telegram" autoCapitalize="off" /></div>
          </div>
          <div>
            <label className="label" htmlFor="dc">Discord</label>
            <input id="dc" className="input" value={dc} onChange={(e) => setDc(e.target.value)} placeholder="username or invite link" autoCapitalize="off" />
          </div>
        </div>
        <div>
          <span className="label">Bio</span>
          <BioEditor value={bio} onChange={setBio} />
        </div>
      </Card>
      <div className="flex gap-2">
        {onCancel && <Button type="button" variant="glass" onClick={onCancel} className="flex-1">Cancel</Button>}
        <Button type="submit" size="lg" loading={busy} disabled={!valid} className="flex-[2]">{existing ? "Save changes" : "Create profile"}</Button>
      </div>
    </form>
  );
}

function ProjectSheet({ open, onClose, user, onDone, onError }: { open: boolean; onClose: () => void; user: ShineUser | null; onDone: (first: boolean) => void; onError: (e: any) => void }) {
  const p = user?.project;
  const [f, setF] = useState({ name: "", x: "", telegram: "", discord: "", xFollowers: "", telegramMembers: "", discordMembers: "" });
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) setF({ name: p?.name || "", x: p?.x || "", telegram: p?.telegram || "", discord: p?.discord || "",
      xFollowers: p?.xFollowers != null ? String(p.xFollowers) : "", telegramMembers: p?.telegramMembers != null ? String(p.telegramMembers) : "", discordMembers: p?.discordMembers != null ? String(p.discordMembers) : "" });
  }, [open]); // eslint-disable-line
  const filled = Object.values(f).filter((v) => v.trim()).length;
  const ok = filled >= 2;
  const num = (v: string) => (v.trim() ? Math.max(0, Math.floor(Number(v.replace(/[^0-9]/g, "")) || 0)) : null);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !ok) return;
    setBusy(true);
    const info: ProjectInfo = { name: f.name.trim() || user.username, x: cleanHandle(f.x), telegram: cleanHandle(f.telegram), discord: f.discord.trim(), xFollowers: num(f.xFollowers), telegramMembers: num(f.telegramMembers), discordMembers: num(f.discordMembers) };
    try {
      if (user.role === "project") { await updateProject(user.uid, info); onDone(false); }
      else { await switchToProject(user.uid, info); onDone(true); }
    } catch (err) { onError(err); } finally { setBusy(false); }
  };
  const field = (k: keyof typeof f, label: string, ph: string, numeric = false) => (
    <div>
      <label className="label" htmlFor={`p-${k}`}>{label}</label>
      <input id={`p-${k}`} className="input" value={f[k]} inputMode={numeric ? "numeric" : undefined} placeholder={ph} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
    </div>
  );
  return (
    <Sheet open={open} onClose={onClose} title={user?.role === "project" ? "Project details" : "Switch to Project"} full>
      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm text-white/55">All fields are optional, but please fill in at least two so applicants can recognise your project.</p>
        {field("name", "Project name", "e.g. Solar Labs")}
        <div className="grid gap-3 sm:grid-cols-3">
          {field("x", "Project X", "@project")}
          {field("telegram", "Project Telegram", "@project")}
          {field("discord", "Project Discord", "invite link")}
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {field("xFollowers", "X followers", "12000", true)}
          {field("telegramMembers", "Telegram members", "5000", true)}
          {field("discordMembers", "Discord members", "8000", true)}
        </div>
        <div className="flex items-center justify-between rounded-2xl bg-white/[.04] px-4 py-3 text-sm">
          <span className="text-white/60">Fields completed</span>
          <span className={`font-semibold ${ok ? "text-pink" : "text-white/50"}`}>{filled} / 7 {ok ? "✓" : "(min. 2)"}</span>
        </div>
        <Button type="submit" size="lg" className="w-full" loading={busy} disabled={!ok}>{user?.role === "project" ? "Save project" : "Switch to Project"}</Button>
      </form>
    </Sheet>
  );
}

function ProjectApplicants({ uid }: { uid: string }) {
  const [apps, setApps] = useState<Application[] | null>(null);
  const toast = useToast();
  useEffect(() => {
    const { db } = fb();
    return onSnapshot(query(collection(db, C.applications), where("projectUid", "==", uid)), (s) => {
      setApps(s.docs.map((d) => ({ id: d.id, ...(d.data() as any) }) as Application).sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0)));
    }, (e) => { toast(friendlyError(e), "err"); setApps([]); });
  }, [uid, toast]);
  return (
    <section className="mt-8">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-lg font-bold">Applicants</h2>
        <Link href="/register" className="text-sm font-semibold text-pink hover:underline">Open Review</Link>
      </div>
      {!apps ? <div className="skeleton h-20 rounded-3xl" /> : !apps.length ? (
        <p className="glass rounded-3xl p-5 text-sm text-white/55">No applications yet. Publish a post in Events to start receiving applicants.</p>
      ) : (
        <div className="space-y-2">
          {apps.slice(0, 20).map((a) => (
            <Link key={a.id} href={`/register?app=${a.id}`} className="glass flex items-center gap-3 rounded-2xl p-3 hover:border-pink/40">
              <Avatar avatar={a.applicantAvatar} size={40} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">@{a.applicantUsername}</p>
                <p className="truncate text-xs text-white/50">{a.postExcerpt} · {timeAgo(a.createdAt)}</p>
              </div>
              <StatusPill status={a.status} />
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
