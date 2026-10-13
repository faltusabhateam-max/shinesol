"use client";
import { useSignSend } from "@/lib/client-api";
import { use, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { addDoc, collection, doc, getDoc, limit, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { fb } from "@/lib/firebase";
import { C } from "@/lib/config";
import type { Application, Chat, Message } from "@/lib/types";
import { SessionGate } from "@/components/gate";
import { useSession } from "@/components/providers";
import { Avatar, Button, Empty, FullLoader, Sheet } from "@/components/ui";
import { ICON } from "@/components/icons";
import { StatusOverlay, errorKind, friendlyError } from "@/components/status";
import { useToast } from "@/components/toast";
import { fileToDataUrl } from "@/lib/image";
import { fmtSol, fmtUsd, short, toDate } from "@/lib/format";
import { preflight, buildTransfer, connection, getBalance, isValidAddress, LAMPORTS, solscanTx } from "@/lib/solana";
import { usePrice } from "@/lib/use-price";
import { useConfirm, UserRejectedError } from "@/components/confirm";
import { VerifiedBadge } from "@/components/flags";
import { PROJECT_FEE_BPS, PROJECT_FEE_WALLET, projectFee } from "@/lib/config";
import { recordLedger } from "@/lib/ledger-client";
import { EscrowBanner, EscrowMessage, EscrowSheet, useEscrowPlan, VaultIcon } from "@/components/escrow";
import type { EscrowPlan } from "@/lib/escrow";

const DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === "1";
function demoData(id: string, uid: string): { chat: Chat; msgs: Message[]; plan: EscrowPlan | null } | null {
  if (!DEMO || !id.startsWith("demo-")) return null;
  const project = id === "demo-project";
  const now = Date.now(), d = (m: number) => new Date(now - m * 60000) as any;
  const chat: Chat = { id, members: [uid, "p"], projectUid: project ? uid : "p", applicantUid: project ? "c" : uid, projectName: typeof window !== "undefined" && location.search.includes("long") ? "Shine Ecosystem Creator Collective Labs" : "Shine", projectAvatar: "/brand/star-192.png", applicantUsername: typeof window !== "undefined" && location.search.includes("long") ? "averyveryverylongcreatorname_2026" : project ? "Zorveny" : "ShineDemo", applicantAvatar: "3", postId: "w51HTKFklvjLn1CB0bWG", postExcerpt: "SHINE IS HIRING — X Creator & Ambassador Program" };
  const other = project ? "c" : "p";
  const msgs: Message[] = [
    { id: "1", senderUid: project ? uid : other, type: "text", text: "Welcome aboard! Excited to have you in the Creator Program 🎉", createdAt: d(90) },
    { id: "2", senderUid: project ? other : uid, type: "text", text: "Thank you! When can I start creating content?", createdAt: d(85) },
    ...(project ? [
      { id: "3", senderUid: "shine", type: "escrow", text: "Auto-payment is ON. Shine funded payment #1 (0.8925 SOL ≈ $100) into the Shine vault. You can start work.", signature: "5GmdZ1rVq4LpsT8b6hYs1T8c2Pq2x9nUj6Yb3kQh9wVxQ3Cw7HqZz4m7g8kJr2JqzXJ1fG3o5bYwqPpVkYxw1Ab", createdAt: d(80) } as any,
      { id: "4", senderUid: "shine", type: "escrow", kind: "due", text: "Payment #1 is due. Shine, please review the work and confirm the release to @Zorveny.", createdAt: d(5) } as any,
    ] : []),
  ];
  const plan: EscrowPlan | null = project ? {
    id, chatId: id, projectUid: uid, creatorUid: "c", projectName: "Shine", creatorUsername: "Zorveny", usd: 100, freq: "weekly", status: "active",
    creatorWallet: "9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin", projectWallet: "86xCnPeV69n6t3DnyGvkKobf9FdN2H9oiVDdaMpo2MMY",
    periods: [{ n: 1, usd: 100, lamports: 892_500_000, status: "due", fundTx: "5GmdZ1rVq4LpsT8b6hYs1T8c2Pq2x9nUj6Yb3kQh9wVxQ3Cw7HqZz4m7g8kJr2JqzXJ1fG3o5bYwqPpVkYxw1Ab", fundedAt: d(7 * 1440), dueAt: d(5) }],
  } : null;
  return { chat, msgs, plan };
}

function PaymentReceipt({ m, mine }: { m: Message; mine: boolean }) {
  const [ok, setOk] = useState<boolean | null>(null);
  useEffect(() => {
    if (!m.signature) return;
    connection().getSignatureStatuses([m.signature], { searchTransactionHistory: true }).then(({ value }) => setOk(!!value[0] && !value[0].err)).catch(() => {});
  }, [m.signature]);
  return (
    <motion.div initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} className="mx-auto my-3 w-full max-w-sm">
      <div className="glass relative overflow-hidden rounded-3xl p-4 text-center">
        <div className="relative">
          <p className="flex items-center justify-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-pink"><img src="/brand/star-64.png" alt="" className="h-3.5 w-3.5" /> Official Shine receipt</p>
          <p className="mt-2 font-display text-3xl font-bold">{fmtSol(m.amount || 0)} SOL</p>
          <p className="text-sm text-white/60">{mine ? "Payment sent" : "Payment received"} · {toDate(m.createdAt)?.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) || "just now"}</p>
          {m.wallet && <p className="mt-1 font-mono text-xs text-white/45">To {short(m.wallet, 6)}</p>}
          <a href={solscanTx(m.signature!)} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold hover:bg-white/15">View on Solscan {ICON.external}</a>
          <p className={`mt-2 text-[11px] ${ok ? "text-emerald-300" : "text-white/40"}`}>{ok === null ? "Checking on-chain status…" : ok ? "✓ Confirmed on Solana" : "Not yet confirmed"}</p>
        </div>
      </div>
    </motion.div>
  );
}

function Inner({ id }: { id: string }) {
  const { uid, profile, wallet, address } = useSession();
  const toast = useToast();
  const signSend = useSignSend();
  const { usd } = usePrice();
  const confirm = useConfirm();
  const [chat, setChat] = useState<Chat | null | undefined>(undefined);
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [menu, setMenu] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [payTo, setPayTo] = useState("");
  const [paying, setPaying] = useState(false);
  const [bal, setBal] = useState<number | null>(null);
  const [status, setStatus] = useState<{ kind: "success" | "failed" | "denied"; title: string; msg?: React.ReactNode } | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const demo = useMemo(() => demoData(id, uid || "demo"), [id, uid]);
  const plan = useEscrowPlan(id, demo ? demo.plan : undefined);
  const [escrowOpen, setEscrowOpen] = useState(false);
  useEffect(() => { if (!demo && new URLSearchParams(location.search).get("escrow")) setEscrowOpen(true); }, [demo]);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (demo) { setChat(demo.chat); setMsgs(demo.msgs); if (new URLSearchParams(location.search).get("escrow")) setTimeout(() => setEscrowOpen(true), 800); return; }
    const { db } = fb();
    const unsub1 = onSnapshot(doc(db, C.chats, id), (s) => setChat(s.exists() ? ({ id: s.id, ...(s.data() as any) } as Chat) : null), () => setChat(null));
    const unsub2 = onSnapshot(query(collection(db, C.chats, id, "messages"), orderBy("createdAt", "asc"), limit(500)), (s) =>
      setMsgs(s.docs.map((d) => ({ id: d.id, ...(d.data() as any) }) as Message)), () => {});
    return () => { unsub1(); unsub2(); };
  }, [id, demo]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [msgs.length]);

  const amProject = chat?.projectUid === uid;
  const sharedWallet = useMemo(() => [...msgs].reverse().find((m) => m.type === "wallet_share" && m.senderUid !== uid)?.wallet, [msgs, uid]);
  const pendingRequest = useMemo(() => {
    const lastReq = [...msgs].reverse().findIndex((m) => m.type === "wallet_request");
    const lastShare = [...msgs].reverse().findIndex((m) => m.type === "wallet_share" && m.senderUid === uid);
    return lastReq >= 0 && (lastShare < 0 || lastShare > lastReq);
  }, [msgs, uid]);

  const [hdrMenu, setHdrMenu] = useState(false);
  if (chat === undefined) return <FullLoader />;
  if (!chat || (!demo && !chat.members.includes(uid!))) return <Empty title="Chat unavailable" text="This conversation doesn't exist or you don't have access." />;

  const post = async (data: Partial<Message>, preview: string) => {
    const { db } = fb();
    await addDoc(collection(db, C.chats, id, "messages"), { ...data, senderUid: uid, createdAt: serverTimestamp() });
    updateDoc(doc(db, C.chats, id), { lastMessage: preview.slice(0, 120), updatedAt: serverTimestamp() }).catch(() => {});
  };
  const sendText = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const t = text.trim();
    if (!t) return;
    setSending(true); setText("");
    try { await post({ type: "text", text: t.slice(0, 4000) }, t); } catch (err) { toast(friendlyError(err), "err"); setText(t); }
    setSending(false);
  };
  const sendImage = async (f?: File) => {
    if (!f) return;
    setSending(true);
    try { const { dataUrl } = await fileToDataUrl(f, 1280, 600_000); await post({ type: "image", image: dataUrl }, "📷 Photo"); } catch (err) { toast(friendlyError(err), "err"); }
    setSending(false);
  };
  const requestWallet = async () => { setMenu(false); try { await post({ type: "wallet_request" }, "Requested your wallet address"); } catch (e) { toast(friendlyError(e), "err"); } };
  const shareWallet = async () => {
    if (!address) return toast("Your wallet is still loading.", "err");
    try { await post({ type: "wallet_share", wallet: address }, "Shared a wallet address"); toast("Wallet address shared", "ok"); } catch (e) { toast(friendlyError(e), "err"); }
  };
  const openPay = async () => {
    setMenu(false);
    let to = sharedWallet || "";
    if (!to) {
      try { const s = await getDoc(doc(fb().db, C.applications, id)); if (s.exists()) to = (s.data() as Application).wallet; } catch {}
    }
    setPayTo(to); setAmount(""); setPayOpen(true);
    if (address) getBalance(address).then(setBal).catch(() => setBal(null));
  };
  const amt = Number(amount);
  const payValid = amt > 0 && isValidAddress(payTo) && payTo !== address && (bal == null || amt * (1 + PROJECT_FEE_BPS / 10_000) <= bal);
  const pay = async () => {
    if (!wallet || !address || !payValid) return;
    setPaying(true);
    try {
      const lamports = Math.round(amt * LAMPORTS);
      const fee = projectFee(lamports);
      const { bytes, networkFee, lastValidBlockHeight } = await buildTransfer(address, payTo.trim(), lamports, { to: PROJECT_FEE_WALLET, lamports: fee });
      await preflight(bytes, { from: address, to: payTo.trim(), spend: lamports + fee, networkFee });
      const ok = await confirm({
        kind: "transaction",
        title: "Send payment",
        subtitle: `Pay @${chat.applicantUsername} for ${chat.projectName}`,
        amount: `${fmtSol(amt)} SOL`,
        amountSub: usd ? `≈ ${fmtUsd(amt * usd)}` : undefined,
        rows: [["To", <span key="t" className="font-mono">{short(payTo.trim(), 6)}</span>], ["Creator receives", `${fmtSol(amt, 6)} SOL`], [`Shine fee (${PROJECT_FEE_BPS / 100}%)`, `${fmtSol(fee / LAMPORTS, 6)} SOL`], ["Network fee", `~${fmtSol(networkFee / LAMPORTS, 6)} SOL`], ["Total", `${fmtSol((lamports + fee + networkFee) / LAMPORTS, 6)} SOL`]],
        warning: "Solana payments are final and cannot be reversed. Make sure the recipient address is correct.",
        confirmLabel: "Confirm & pay",
      });
      if (!ok) throw new UserRejectedError();
      const sig = await signSend(bytes, lastValidBlockHeight);
      recordLedger(sig, "payment", id);
      await post({ type: "payment", amount: amt, signature: sig, wallet: payTo.trim() }, `Payment of ${fmtSol(amt)} SOL sent`);
      const { db } = fb();
      setDoc(doc(db, C.transactions, sig), { signature: sig, chatId: id, fromUid: uid, toUid: chat.applicantUid, from: address, to: payTo.trim(), amount: amt, kind: "payment", label: `Payment from ${chat.projectName}`, createdAt: serverTimestamp() }).catch(() => {});
      setPayOpen(false);
      setStatus({ kind: "success", title: "Payment sent", msg: <>{fmtSol(amt)} SOL delivered to @{chat.applicantUsername}. <a className="text-pink underline" href={solscanTx(sig)} target="_blank" rel="noopener noreferrer">View on Solscan</a></> });
    } catch (e) {
      const k = errorKind(e);
      setStatus({ kind: k, title: k === "denied" ? "Payment cancelled" : "Payment failed", msg: friendlyError(e) });
    }
    setPaying(false);
  };

  
  const other = amProject ? { name: `@${chat.applicantUsername}`, avatar: chat.applicantAvatar, href: `/u/${chat.applicantUsername}` } : { name: chat.projectName, avatar: chat.projectAvatar, href: "" };

  return (
    <div className="flex h-[calc(100dvh-6rem)] flex-col">
      <div className="glass relative z-30 mb-3 flex items-center gap-2 rounded-2xl p-2.5 sm:gap-3">
        <Link href="/chat" className="rounded-full p-2 text-white/70 hover:bg-white/10" aria-label="Back">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
        </Link>
        <Avatar avatar={other.avatar} size={40} />
        <div className="min-w-0 flex-1">
          {other.href ? <Link href={other.href} className="flex min-w-0 items-center gap-1 font-semibold hover:underline"><span className="truncate">{other.name}</span><VerifiedBadge uid={amProject ? chat.applicantUid : chat.projectUid} size={15} /></Link> : <p className="flex items-center gap-1 min-w-0 font-semibold"><span className="truncate">{other.name}</span><VerifiedBadge uid={chat.projectUid} size={15} /></p>}
          <p className="truncate text-xs text-white/45">{chat.postExcerpt}</p>
        </div>
        {amProject && <div className="hidden shrink-0 items-center gap-2 sm:flex"><Button size="sm" variant="glass" onClick={() => setEscrowOpen(true)} aria-label="Auto-payment"><VaultIcon /></Button>
          <Button size="sm" onClick={openPay}>{ICON.sol} Pay</Button></div>}
        {amProject && <div className="relative shrink-0 sm:hidden">
          <button onClick={() => setHdrMenu((v) => !v)} aria-label="More actions" className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white/80 hover:bg-white/15">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="12" r="1.8" /></svg></button>
          <AnimatePresence>{hdrMenu && <>
            <div className="fixed inset-0 z-40" onClick={() => setHdrMenu(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="absolute right-0 top-11 z-50 w-48 border border-white/10 bg-[#140a12]/95 overflow-hidden rounded-2xl p-1 shadow-xl">
              <button onClick={() => { setHdrMenu(false); openPay(); }} className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-pink hover:bg-white/5">{ICON.sol} Pay</button>
              <button onClick={() => { setHdrMenu(false); setEscrowOpen(true); }} className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-white/5"><VaultIcon /> Auto-payment</button>
            </motion.div></>}</AnimatePresence>
        </div>}
      </div>
      <EscrowBanner plan={plan} amProject={amProject} onOpen={() => setEscrowOpen(true)} />

      <div className="no-scrollbar flex-1 space-y-2 overflow-y-auto px-1 pb-2">
        <div className="mx-auto my-2 w-fit rounded-full bg-white/5 px-3 py-1 text-xs text-white/50">{ICON.lock && <span className="mr-1 inline-block align-[-2px]">{ICON.lock}</span>}Private chat unlocked after approval</div>
        <AnimatePresence initial={false}>
          {msgs.map((m) => {
            const mine = m.senderUid === uid;
            if (m.type === "payment") return <PaymentReceipt key={m.id} m={m} mine={mine} />;
            if ((m.type as string) === "escrow") return <EscrowMessage key={m.id} m={m as any} />;
            return (
              <motion.div key={m.id} initial={{ opacity: 0, y: 10, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-3xl px-4 py-2.5 text-[0.95rem] ${mine ? "btn-pink rounded-br-lg text-white" : "glass rounded-bl-lg"}`}>
                  {m.type === "text" && <p className="whitespace-pre-wrap break-words">{m.text}</p>}
                  {m.type === "image" && <img src={m.image} alt="" className="-mx-1 max-h-80 rounded-2xl object-contain" />}
                  {m.type === "wallet_request" && (
                    <div>
                      <p className="font-semibold">{ICON.wallet && <span className="mr-1 inline-block align-[-3px]">{ICON.wallet}</span>}Wallet address requested</p>
                      <p className={`text-sm ${mine ? "text-white/85" : "text-white/60"}`}>{mine ? "Waiting for the applicant to share their address." : "The project would like your Solana wallet address for payment."}</p>
                      {!mine && <Button size="sm" variant="glass" className="mt-2 w-full" onClick={shareWallet}>Share my wallet address</Button>}
                    </div>
                  )}
                  {m.type === "wallet_share" && (
                    <div>
                      <p className="font-semibold">Wallet address</p>
                      <button onClick={() => { navigator.clipboard.writeText(m.wallet || ""); toast("Address copied", "ok"); }} className="mt-1 break-all text-left font-mono text-xs opacity-90 hover:underline">{m.wallet}</button>
                    </div>
                  )}
                  <p className={`mt-1 text-right text-[10px] ${mine ? "text-white/70" : "text-white/35"}`}>{toDate(m.createdAt)?.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }) || "sending…"}</p>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        <div ref={endRef} />
      </div>

      {!amProject && pendingRequest && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-2">
          <Button className="w-full" onClick={shareWallet}>{ICON.wallet} Share my wallet address</Button>
        </motion.div>
      )}
      <form onSubmit={sendText} className="glass safe-bottom flex items-end gap-2 rounded-3xl p-2">
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { sendImage(e.target.files?.[0]); e.target.value = ""; }} />
        <button type="button" onClick={() => (amProject ? setMenu(true) : fileRef.current?.click())} className="rounded-full p-2.5 text-white/70 hover:bg-white/10 hover:text-pink" aria-label={amProject ? "More actions" : "Send image"}>
          {amProject ? ICON.plus : ICON.image}
        </button>
        <textarea value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendText(); } }}
          rows={1} placeholder="Write a message…" className="max-h-32 flex-1 resize-none bg-transparent px-1 py-2.5 outline-none placeholder:text-white/35" />
        <motion.button whileTap={{ scale: 0.9 }} type="submit" disabled={sending || !text.trim()} className="btn-pink rounded-full p-2.5 text-white disabled:opacity-40" aria-label="Send">{ICON.send}</motion.button>
      </form>

      <Sheet open={menu} onClose={() => setMenu(false)} title="Actions">
        <div className="grid gap-2">
          <Button variant="glass" onClick={() => { setMenu(false); fileRef.current?.click(); }}>{ICON.image} Send image</Button>
          <Button variant="glass" onClick={requestWallet}>{ICON.wallet} Request wallet address</Button>
          <Button variant="glass" onClick={() => { setMenu(false); setEscrowOpen(true); }}><VaultIcon /> Auto-payment (escrow)</Button>
          <Button onClick={openPay}>{ICON.sol} Pay in SOL</Button>
        </div>
      </Sheet>

      <Sheet open={payOpen} onClose={() => !paying && setPayOpen(false)} title={`Pay @${chat.applicantUsername}`}>
        <div className="space-y-4">
          <div>
            <label className="label" htmlFor="amt">Amount (SOL)</label>
            <input id="amt" className="input !text-2xl font-semibold" inputMode="decimal" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))} />
            <p className="mt-1.5 flex justify-between text-xs text-white/50"><span>{usd && amt ? `≈ ${fmtUsd(amt * usd)}` : "\u00a0"}</span><span>Balance: {bal == null ? "…" : `${fmtSol(bal, 4)} SOL`}</span></p>
          </div>
          <div>
            <label className="label" htmlFor="to">Recipient wallet</label>
            <input id="to" className="input font-mono text-sm" value={payTo} onChange={(e) => setPayTo(e.target.value.trim())} placeholder="Solana address" />
            <p className="mt-1.5 text-xs text-white/45">{sharedWallet && payTo === sharedWallet ? "Address shared by the applicant in this chat." : payTo ? "Signed payout address from the application." : "Request the applicant's wallet address first."}</p>
          </div>
          {bal != null && amt > bal && <p className="text-sm text-red-300">Amount exceeds your balance.</p>}
          <Button size="lg" className="w-full" loading={paying} disabled={!payValid} onClick={pay}>{paying ? "Confirming on Solana…" : `Send ${amt ? fmtSol(amt) : ""} SOL`}</Button>
          <p className="text-center text-xs text-white/50">Shine fee {PROJECT_FEE_BPS / 100}% ({amt ? `${fmtSol(amt * PROJECT_FEE_BPS / 10_000, 6)} SOL` : "—"}) is added and sent to the Shine vault in the same transaction.</p>
          <p className="text-center text-xs text-white/40">Payments are final on-chain. A receipt with the Solscan link is posted to this chat automatically.</p>
        </div>
      </Sheet>
      <EscrowSheet open={escrowOpen} onClose={() => setEscrowOpen(false)} plan={plan} chatId={id} amProject={amProject} creatorName={`@${chat.applicantUsername}`} onStatus={(x) => { setEscrowOpen(false); setStatus(x); }} />
      <StatusOverlay kind={status?.kind ?? null} title={status?.title} message={status?.msg} onClose={() => setStatus(null)} />
    </div>
  );
}

export default function ChatRoom({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <SessionGate text="Sign in to open this conversation."><Inner id={id} /></SessionGate>;
}
