"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { collection, doc, limit, onSnapshot, orderBy, query } from "firebase/firestore";
import { fb } from "@/lib/firebase";
import { C } from "@/lib/config";
import type { ShineUser, SupportMessage, SupportRequest, SupportThread as Thread } from "@/lib/types";
import { listUsers } from "@/lib/db";
import { REQUESTS, markRead, respondToRequest, sendAsSupport, sendAsUser } from "@/lib/support";
import { fileToDataUrl } from "@/lib/image";
import { toDate } from "@/lib/format";
import { normalizeLinks, toHandle } from "@/lib/handles";
import { isValidAddress } from "@/lib/solana";
import { Avatar, Button } from "./ui";
import { ICON, XIcon, TelegramIcon } from "./icons";
import { BottomSheet } from "./bottom-sheet";
import { VerifiedBadge } from "./flags";
import { useToast } from "./toast";
import { friendlyError } from "./status";
import { usePrivy } from "@privy-io/react-auth";

export function SupportAvatar({ size = 44 }: { size?: number }) {
  return (
    <span className="relative grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-pink/40 to-black ring-2 ring-pink/60 shadow-[var(--raise-sm)]" style={{ width: size, height: size }}>
      <motion.img src="/brand/star-192.png" alt="" style={{ width: size * 0.62, height: size * 0.62 }} />
    </span>
  );
}

const SHIELD = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z" /><path d="M12 8v4M12 16h.01" /></svg>;
const FORM_ICON = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="3" width="16" height="18" rx="3" /><path d="M8 8h8M8 12h8M8 16h5" /></svg>;

function RequestCard({ m, mode, profile }: { m: SupportMessage; mode: "user" | "agent"; profile?: ShineUser | null }) {
  const r = m.request!;
  const [vals, setVals] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const done = !!m.response;
  const fix = (key: string, v: string) => key === "x" ? toHandle(v, "x") : key === "telegram" ? toHandle(v, "telegram") : normalizeLinks(v.trim());
  const missing = r.fields.some((f) => !String(vals[f.key] || "").trim());
  const submit = async () => {
    if (!profile) return;
    const out: Record<string, string> = {};
    for (const f of r.fields) out[f.key] = fix(f.key, vals[f.key] || "").slice(0, 1000);
    if (out.wallet && !isValidAddress(out.wallet)) return toast("That isn't a valid Solana address.", "err");
    setBusy(true);
    try { await respondToRequest(profile, m.id, out, r.title); toast("Submitted to Shine Support", "ok"); } catch (e) { toast(friendlyError(e), "err"); }
    setBusy(false);
  };
  return (
    <motion.div initial={{ opacity: 0, y: 10, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="w-full max-w-sm">
      <div className="glass relative overflow-hidden rounded-3xl border-pink/30 p-4">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-pink to-transparent" />
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl icon-grad neu-sm text-pink">{r.kind === "x" ? <XIcon size={15} /> : r.kind === "telegram" ? <TelegramIcon size={17} /> : r.kind === "wallet" ? ICON.wallet : FORM_ICON}</span>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-pink">Request from Shine Support</p>
            <p className="font-semibold leading-tight">{r.title}</p>
          </div>
        </div>
        {done ? (
          <div className="mt-3 space-y-1.5 rounded-2xl bg-white/[.04] p-3">
            {r.fields.map((f) => <div key={f.key} className="text-sm"><p className="text-[11px] text-white/45">{f.label}</p><p className="break-words text-white/90">{m.response?.[f.key] || "—"}</p></div>)}
            <p className="pt-1 text-[11px] font-semibold text-emerald-300">✓ Submitted</p>
          </div>
        ) : mode === "user" ? (
          <div className="mt-3 space-y-2.5">
            {r.fields.map((f) => (
              <div key={f.key}>
                <label className="mb-1 block text-xs font-semibold text-white/60">{f.label}</label>
                {f.multiline
                  ? <textarea rows={3} value={vals[f.key] || ""} placeholder={f.placeholder} onChange={(e) => setVals((v) => ({ ...v, [f.key]: e.target.value }))} className="input resize-none !py-2.5 text-sm" />
                  : <input value={vals[f.key] || ""} placeholder={f.placeholder} onChange={(e) => setVals((v) => ({ ...v, [f.key]: e.target.value }))} onBlur={(e) => setVals((v) => ({ ...v, [f.key]: fix(f.key, e.target.value) }))} autoCapitalize="off" className="input !py-2.5 text-sm" />}
              </div>
            ))}
            <Button className="w-full" loading={busy} disabled={missing} onClick={submit}>Submit</Button>
          </div>
        ) : (
          <p className="mt-3 flex items-center gap-2 text-sm text-white/50"><motion.span className="h-2 w-2 rounded-full bg-amber-300" />Waiting for the user to respond…</p>
        )}
      </div>
    </motion.div>
  );
}

function ReportCard({ m }: { m: SupportMessage }) {
  const r = m.report!;
  return (
    <motion.div initial={{ opacity: 0, y: 10, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="w-full max-w-sm">
      <div className="relative overflow-hidden rounded-3xl border border-red-400/30 bg-red-500/[.07] p-4">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-red-500/15 text-red-300 ring-1 ring-red-400/30">{SHIELD}</span>
          <div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-red-300">Scam report</p><p className="truncate font-semibold">{r.projectName} <span className="font-normal text-white/50">@{r.projectUsername}</span></p></div>
        </div>
        {r.details && <p className="mt-3 whitespace-pre-wrap break-words text-sm text-white/80">{r.details}</p>}
        {m.image && <img src={m.image} alt="" className="mt-3 max-h-64 w-full rounded-2xl object-contain" />}
      </div>
    </motion.div>
  );
}

function ReportSheet({ open, onClose, onSend }: { open: boolean; onClose: () => void; onSend: (p: ShineUser, details: string, image: string | null) => Promise<void> }) {
  const [projects, setProjects] = useState<ShineUser[] | null>(null);
  const [q, setQ] = useState("");
  const [pick, setPick] = useState<ShineUser | null>(null);
  const [details, setDetails] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (open && !projects) listUsers().then((u) => setProjects(u.filter((x) => x.role === "project"))).catch(() => setProjects([])); }, [open, projects]);
  useEffect(() => { if (!open) { setPick(null); setDetails(""); setImage(null); setQ(""); } }, [open]);
  const t = q.trim().toLowerCase().replace(/^@/, "");
  const list = (projects || []).filter((p) => !t || p.usernameLower.includes(t) || (p.project?.name || "").toLowerCase().includes(t));
  return (
    <BottomSheet open={open} onClose={() => !busy && onClose()} title="Report a scam">
      <div className="space-y-3 pb-4">
        {!pick ? (
          <>
            <p className="text-sm text-white/55">Which project are you reporting?</p>
            <div className="relative"><span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40">{ICON.search}</span>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search projects" className="input !pl-10" /></div>
            <div className="no-scrollbar max-h-[34vh] space-y-1.5 overflow-y-auto">
              {projects === null ? <p className="py-6 text-center text-sm text-white/40">Loading projects…</p> : !list.length ? <p className="py-6 text-center text-sm text-white/40">No projects found.</p> :
                list.map((p) => (
                  <button key={p.uid} type="button" onClick={() => setPick(p)} className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[.03] p-2.5 text-left hover:border-pink/40">
                    <Avatar avatar={p.avatar} size={36} />
                    <div className="min-w-0"><p className="flex items-center gap-1 min-w-0 text-sm font-semibold"><span className="truncate">{p.project?.name || p.username}</span><VerifiedBadge uid={p.uid} size={13} /></p><p className="text-xs text-white/45">@{p.username}</p></div>
                  </button>
                ))}
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-3 rounded-2xl border border-red-400/30 bg-red-500/[.06] p-2.5">
              <Avatar avatar={pick.avatar} size={36} />
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{pick.project?.name || pick.username}</p><p className="text-xs text-white/45">@{pick.username}</p></div>
              <button type="button" onClick={() => setPick(null)} className="text-xs font-semibold text-white/55 hover:text-white">Change</button>
            </div>
            <textarea rows={4} value={details} onChange={(e) => setDetails(e.target.value.slice(0, 2000))} placeholder="What happened? Include dates, amounts, links or transaction signatures." className="input resize-none text-sm" />
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) setImage((await fileToDataUrl(f, 1280, 500_000)).dataUrl); }} />
            {image ? (
              <div className="relative"><img src={image} alt="" className="max-h-40 w-full rounded-2xl object-contain" /><button type="button" onClick={() => setImage(null)} className="absolute right-2 top-2 rounded-full bg-black/70 px-2 text-sm">×</button></div>
            ) : <Button variant="glass" size="sm" onClick={() => fileRef.current?.click()}>{ICON.image} Attach screenshot</Button>}
            <Button size="lg" variant="danger" className="w-full" loading={busy} disabled={details.trim().length < 10}
              onClick={async () => { setBusy(true); try { await onSend(pick, details.trim(), image); onClose(); } finally { setBusy(false); } }}>Submit report</Button>
            <p className="text-center text-xs text-white/40">Reports are reviewed by the Shine team. Never share your private key or seed phrase with anyone.</p>
          </>
        )}
      </div>
    </BottomSheet>
  );
}

/** A Shine Support conversation. `mode="user"` for the account owner, `mode="agent"` for admins. */
export function SupportConversation({ threadUid, mode, profile, agentUid, header, backHref, heightClass = "h-[calc(100dvh-6rem)]", adminClear }: { threadUid: string; mode: "user" | "agent"; profile?: ShineUser | null; agentUid?: string; header?: React.ReactNode; backHref?: string; heightClass?: string; adminClear?: (uid: string) => Promise<any> }) {
  const toast = useToast();
  const [msgs, setMsgs] = useState<SupportMessage[] | null>(null);
  const [thread, setThread] = useState<Thread | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [menu, setMenu] = useState(false);
  const [report, setReport] = useState(false);
  const [custom, setCustom] = useState(false);
  const [customTitle, setCustomTitle] = useState("");
  const [customLabel, setCustomLabel] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const { db } = fb();
    setMsgs(null);
    const u1 = onSnapshot(query(collection(db, C.support, threadUid, "messages"), orderBy("createdAt", "asc"), limit(500)),
      (s) => setMsgs(s.docs.map((d) => ({ id: d.id, ...(d.data() as any) }) as SupportMessage)), () => setMsgs([]));
    const u2 = onSnapshot(doc(db, C.support, threadUid), (s) => setThread(s.exists() ? (s.data() as Thread) : null), () => {});
    return () => { u1(); u2(); };
  }, [threadUid]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [msgs?.length]);
  useEffect(() => {
    if (!thread) return;
    if (mode === "user" && thread.unreadForUser) markRead(threadUid, "user");
    if (mode === "agent" && thread.unreadForSupport) markRead(threadUid, "support");
  }, [thread, mode, threadUid]);

  const [ending, setEnding] = useState(false);
  const { getAccessToken } = usePrivy();
  const supportAction = async (action: "end" | "clear" | "reopen") => {
    setEnding(true);
    try {
      if (mode === "agent") { if (action === "clear") await adminClear?.(threadUid); }
      else {
        const t = await getAccessToken();
        const r = await fetch("/api/support", { method: "POST", headers: { authorization: `Bearer ${t}`, "content-type": "application/json" }, body: JSON.stringify({ action }) });
        if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || "Something went wrong.");
      }
      toast(action === "end" ? "Chat ended" : action === "clear" ? "Chat cleared — start a fresh conversation anytime" : "Chat reopened", "ok");
      setMenu(false);
    } catch (e) { toast(friendlyError(e), "err"); }
    setEnding(false);
  };
  const ended = !!(thread as any)?.endedAt;
  const send = async (data: Partial<SupportMessage>, preview: string) => {
    if (mode === "user") { if (!profile) throw new Error("Complete your profile to contact support."); await sendAsUser(profile, data, preview); }
    else await sendAsSupport(threadUid, agentUid!, data, preview);
  };
  const sendText = async (t0?: string) => {
    const t = (t0 ?? text).trim();
    if (!t) return;
    setSending(true); if (!t0) setText("");
    try { await send({ type: "text", text: t.slice(0, 4000) }, t); } catch (e) { toast(friendlyError(e), "err"); if (!t0) setText(t); }
    setSending(false);
  };
  const sendImage = async (f?: File) => {
    if (!f) return;
    setSending(true);
    try { const { dataUrl } = await fileToDataUrl(f, 1280, 600_000); await send({ type: "image", image: dataUrl }, "📷 Photo"); } catch (e) { toast(friendlyError(e), "err"); }
    setSending(false);
  };
  const sendRequest = async (r: SupportRequest) => {
    setMenu(false); setCustom(false);
    try { await send({ type: "request", request: r, response: null }, `Request: ${r.title}`); } catch (e) { toast(friendlyError(e), "err"); }
  };

  const welcome = useMemo(() => `Hi${profile?.username ? ` @${profile.username}` : ""} 👋 Welcome to Shine Support. Ask us anything about your account, applications or payments — or report a suspicious project. We usually reply within a few hours.`, [profile?.username]);
  const quick = ["I need help with my account", "I have a payment issue", "How do I get verified?"];

  return (
    <div className={`flex ${heightClass} flex-col`}>
      {header ?? (
        <div className="glass mb-3 flex items-center gap-3 rounded-2xl p-2.5">
          {backHref && <Link href={backHref} className="rounded-full p-2 text-white/70 hover:bg-white/10" aria-label="Back"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg></Link>}
          <SupportAvatar size={40} />
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1 min-w-0 whitespace-nowrap font-semibold"><span className="truncate">Shine Support </span><VerifiedBadge force size={15} /></p>
            <p className="flex items-center gap-1.5 truncate text-xs text-emerald-300/80"><span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />Official team</p>
          </div>
          {mode === "user" && <Button size="sm" variant="danger" className="shrink-0 !px-3" onClick={() => setReport(true)}>{SHIELD}<span className="hidden sm:inline">Report a scam</span><span className="sm:hidden">Report</span></Button>}
        </div>
      )}

      <div className="no-scrollbar flex-1 space-y-2 overflow-y-auto px-1 pb-2">
        <div className="mx-auto my-2 w-fit rounded-full bg-white/5 px-3 py-1 text-xs text-white/50"><span className="mr-1 inline-block align-[-2px]">{ICON.lock}</span>Shine staff will never ask for your private key or seed phrase</div>
        {mode === "user" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-end gap-2">
            <SupportAvatar size={28} />
            <div className="glass max-w-[80%] rounded-3xl rounded-bl-lg px-4 py-2.5 text-[0.95rem]">{welcome}</div>
          </motion.div>
        )}
        <AnimatePresence initial={false}>
          {(msgs || []).map((m) => {
            const mine = (mode === "user" && m.from === "user") || (mode === "agent" && m.from === "support");
            const time = toDate(m.createdAt)?.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }) || "sending…";
            return (
              <motion.div key={m.id} initial={{ opacity: 0, y: 10, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} className={`flex items-end gap-2 ${mine ? "justify-end" : "justify-start"}`}>
                {!mine && m.from === "support" && <SupportAvatar size={28} />}
                {m.type === "request" ? <RequestCard m={m} mode={mode} profile={profile} />
                  : m.type === "report" ? <ReportCard m={m} />
                  : (
                    <div className={`max-w-[80%] rounded-3xl px-4 py-2.5 text-[0.95rem] ${mine ? "btn-pink rounded-br-lg text-white" : "glass rounded-bl-lg"}`}>
                      {m.type === "text" && <p className="whitespace-pre-wrap break-words">{m.text}</p>}
                      {m.type === "image" && <img src={m.image} alt="" className="-mx-1 max-h-80 rounded-2xl object-contain" />}
                      <p className={`mt-1 text-right text-[10px] ${mine ? "text-white/70" : "text-white/35"}`}>{time}</p>
                    </div>
                  )}
              </motion.div>
            );
          })}
        </AnimatePresence>
        {mode === "user" && msgs !== null && msgs.length === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="flex flex-wrap gap-2 pl-9 pt-1">
            <button onClick={() => setReport(true)} className="inline-flex items-center gap-1.5 rounded-full border border-red-400/40 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-200 hover:bg-red-500/20">{SHIELD} Report a scam</button>
            {quick.map((q) => <button key={q} onClick={() => sendText(q)} className="rounded-full border border-pink/30 bg-pink/[.06] px-3 py-1.5 text-xs font-semibold text-pink hover:bg-pink/15">{q}</button>)}
          </motion.div>
        )}
        <div ref={endRef} />
      </div>

      {ended && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass safe-bottom mb-2 rounded-3xl p-4 text-center">
          <p className="font-semibold">{mode === "user" ? "You ended this chat" : "The user ended this chat"}</p>
          <p className="mb-3 text-xs text-white/50">{mode === "user" ? "Clear it to start a fresh conversation, or reopen it to continue." : "You can clear the thread for them."}</p>
          <div className="flex justify-center gap-2">
            {mode === "user" && <Button size="sm" variant="glass" loading={ending} onClick={() => supportAction("reopen")}>Reopen</Button>}
            <Button size="sm" variant="danger" loading={ending} onClick={() => supportAction("clear")}>{ICON.trash} Clear chat</Button>
          </div>
        </motion.div>
      )}
      {!(ended && mode === "user") && <form onSubmit={(e) => { e.preventDefault(); sendText(); }} className="glass safe-bottom flex items-end gap-2 rounded-3xl p-2">
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { sendImage(e.target.files?.[0]); e.target.value = ""; }} />
        <button type="button" onClick={() => setMenu(true)} className="rounded-full p-2.5 text-white/70 hover:bg-white/10 hover:text-pink" aria-label="More actions">{ICON.plus}</button>
        <textarea value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendText(); } }}
          rows={1} placeholder={mode === "agent" ? "Reply as Shine Support…" : "Message Shine Support…"} className="max-h-32 flex-1 resize-none bg-transparent px-1 py-2.5 outline-none placeholder:text-white/35" />
        <motion.button whileTap={{ scale: 0.9 }} type="submit" disabled={sending || !text.trim()} className="btn-pink rounded-full p-2.5 text-white disabled:opacity-40" aria-label="Send">{ICON.send}</motion.button>
      </form>}

      <BottomSheet open={menu} onClose={() => setMenu(false)} title={mode === "agent" ? "Support actions" : "Actions"}>
        <div className="grid gap-2 pb-4">
          <Button variant="glass" onClick={() => { setMenu(false); fileRef.current?.click(); }}>{ICON.image} Send image</Button>
          {mode === "user" ? (
            <>
              <Button variant="danger" onClick={() => { setMenu(false); setReport(true); }}>{SHIELD} Report a scam</Button>
              {!ended ? <Button variant="glass" loading={ending} disabled={!thread} onClick={() => supportAction("end")}>End chat</Button>
                : <Button variant="danger" loading={ending} onClick={() => supportAction("clear")}>{ICON.trash} Clear chat</Button>}
            </>
          ) : (
            <>
              <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">Structured requests</p>
              <Button variant="glass" onClick={() => sendRequest(REQUESTS.x)}><XIcon size={14} /> Request X account</Button>
              <Button variant="glass" onClick={() => sendRequest(REQUESTS.project)}>{FORM_ICON} Request project details</Button>
              <Button variant="glass" onClick={() => sendRequest(REQUESTS.telegram)}><TelegramIcon size={16} /> Request Telegram username</Button>
              <Button variant="glass" onClick={() => sendRequest(REQUESTS.wallet)}>{ICON.wallet} Request wallet address</Button>
              <Button variant="glass" onClick={() => { setMenu(false); setCustom(true); }}>{ICON.edit} Custom request…</Button>
              {adminClear && <Button variant="danger" loading={ending} onClick={() => { if (confirm("Clear this user's entire support chat? This is audit-logged and can't be undone.")) supportAction("clear"); }}>{ICON.trash} Clear chat</Button>}
            </>
          )}
        </div>
      </BottomSheet>
      <BottomSheet open={custom} onClose={() => setCustom(false)} title="Custom request">
        <div className="space-y-3 pb-4">
          <input value={customTitle} onChange={(e) => setCustomTitle(e.target.value.slice(0, 80))} placeholder="Card title, e.g. Share the transaction signature" className="input" />
          <input value={customLabel} onChange={(e) => setCustomLabel(e.target.value.slice(0, 80))} placeholder="Field label, e.g. Transaction signature" className="input" />
          <Button className="w-full" disabled={!customTitle.trim() || !customLabel.trim()} onClick={() => { sendRequest({ kind: "custom", title: customTitle.trim(), fields: [{ key: "answer", label: customLabel.trim(), multiline: true }] }); setCustomTitle(""); setCustomLabel(""); }}>Send request</Button>
        </div>
      </BottomSheet>
      {mode === "user" && <ReportSheet open={report} onClose={() => setReport(false)} onSend={async (p, details, image) => {
        try {
          await send({ type: "report", report: { projectUid: p.uid, projectName: p.project?.name || p.username, projectUsername: p.username, details }, ...(image ? { image } : {}) }, `🚩 Scam report: ${p.project?.name || p.username}`);
          toast("Report sent. Our team will review it.", "ok");
        } catch (e) { toast(friendlyError(e), "err"); throw e; }
      }} />}
    </div>
  );
}
