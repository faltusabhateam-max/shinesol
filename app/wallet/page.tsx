"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { useImportSeedPhrase } from "@privy-io/react-auth";
import { useExportWallet, useImportWallet } from "@privy-io/react-auth/solana";
import Link from "next/link";
import { BottomSheet } from "@/components/bottom-sheet";
import { SessionGate } from "@/components/gate";
import { useSession } from "@/components/providers";
import { Button, Card, Segmented, Sheet, StarLoader } from "@/components/ui";
import { ICON } from "@/components/icons";
import { StatusOverlay, errorKind, friendlyError } from "@/components/status";
import { useToast } from "@/components/toast";
import { C } from "@/lib/config";
import { fb } from "@/lib/firebase";
import { fmtSol, fmtUsd, short } from "@/lib/format";
import { getBalance, getHistory, solscanAccount, solscanTx, type HistoryItem } from "@/lib/solana";
import { usePrice } from "@/lib/use-price";


function Inner() {
  const { address, wallet, wallets, setActiveAddress, uid } = useSession();
  const toast = useToast();
  const { usd, change } = usePrice();
  const { exportWallet } = useExportWallet();
  const [bal, setBal] = useState<number | null>(null);
  const [hist, setHist] = useState<HistoryItem[] | null>(null);
  const [histErr, setHistErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [sheet, setSheet] = useState<null | "receive" | "import">(null);
  const [status, setStatus] = useState<{ kind: "success" | "failed" | "denied"; title: string; msg?: React.ReactNode } | null>(null);

  useEffect(() => { if (new URLSearchParams(window.location.search).get("sheet") === "receive") setSheet("receive"); }, []);
  const refresh = useCallback(async () => {
    if (!address) return;
    setLoading(true); setHistErr(null);
    try { setBal(await getBalance(address)); } catch { setBal(null); }
    try { setHist(await getHistory(address, 30)); } catch (e: any) { setHistErr("Transaction history is temporarily unavailable. Please refresh."); setHist([]); }
    setLoading(false);
  }, [address]);
  useEffect(() => { setBal(null); setHist(null); refresh(); }, [refresh]);
  useEffect(() => {
    if (!uid) return;
    const { db } = fb();
    const add = (s: any) => setLabels((l) => { const n = { ...l }; s.docs.forEach((d: any) => { const t = d.data(); n[d.id] = t.toUid === uid ? t.label : `Payment to applicant`; }); return n; });
    const u1 = onSnapshot(query(collection(db, C.transactions), where("toUid", "==", uid)), add, () => {});
    const u2 = onSnapshot(query(collection(db, C.transactions), where("fromUid", "==", uid)), add, () => {});
    return () => { u1(); u2(); };
  }, [uid]);

  if (!address) return <div className="py-20"><StarLoader label="Preparing your Shine Wallet…" /></div>;
  const usdVal = bal != null && usd ? bal * usd : null;

  return (
    <>
      <div className="mb-4 flex items-end justify-between">
        <div><h1 className="font-display text-3xl font-bold">Wallet</h1><p className="mt-1 text-sm text-white/55">Your self-custodial Solana wallet.</p></div>
        <button onClick={refresh} className="neu-sm grid h-11 w-11 place-items-center rounded-[14px] text-white/70 hover:text-white" aria-label="Refresh">
          <motion.span className="block" animate={loading ? { rotate: 360 } : { rotate: 0 }} transition={loading ? { repeat: Infinity, duration: 0.9, ease: "linear" } : {}}>{ICON.refresh}</motion.span>
        </button>
      </div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass relative overflow-hidden rounded-[24px] p-6">
        <div className="flex items-start justify-between"><span className="icon-grad neu-sm grid h-11 w-11 place-items-center rounded-[14px] text-pink">{ICON.wallet}</span><span className="dot-grad mt-2 h-2.5 w-2.5 rounded-full" aria-hidden /></div>
        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-white/55">Total balance</p>
        <div className="mt-2 flex items-baseline gap-2">
          {bal == null ? <div className="skeleton h-10 w-40 rounded-xl" /> : <motion.span key={bal} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="font-display text-[44px] font-extrabold leading-none tracking-tight min-[380px]:text-5xl">{fmtSol(bal, 4)}</motion.span>}
          <span className="text-lg font-bold grad-text">SOL</span>
        </div>
        <p className="mt-1 text-sm text-white/60">{usdVal != null ? fmtUsd(usdVal) : usd ? "—" : "Fetching price…"}{usd && <span className="ml-2 text-white/40">1 SOL = {fmtUsd(usd)}{change != null && <span className={change >= 0 ? "text-emerald-300" : "text-red-300"}> {change >= 0 ? "+" : ""}{change.toFixed(2)}%</span>}</span>}</p>
        <button onClick={() => { navigator.clipboard.writeText(address); toast("Address copied", "ok"); }} className="neu-inset mt-5 inline-flex items-center gap-2 rounded-full px-3.5 py-2 font-mono text-xs text-white/85 hover:bg-white/15">
          {short(address, 6)} {ICON.copy}
        </button>
        <div className="mt-5 grid grid-cols-3 gap-2">
          <Link href="/wallet/send" className="contents"><Button className="w-full flex-col !gap-1 !py-3">{ICON.arrowUp}<span className="text-xs">Send</span></Button></Link>
          <Button variant="glass" onClick={() => setSheet("receive")} className="flex-col !gap-1 !py-3">{ICON.arrowDown}<span className="text-xs">Receive</span></Button>
          <Button variant="glass" onClick={() => setSheet("import")} className="flex-col !gap-1 !py-3">{ICON.key}<span className="text-xs">Import</span></Button>
        </div>
      </motion.div>

      {wallets.length > 1 && (
        <Card className="mt-3 p-3">
          <p className="mb-2 px-1 text-xs font-semibold text-white/50">Active wallet</p>
          <div className="space-y-1">
            {wallets.map((w: any, i: number) => (
              <button key={w.address} onClick={() => setActiveAddress(w.address)} className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm ${w.address === address ? "neu-inset" : "hover:bg-white/5"}`}>
                <span className="font-mono">{short(w.address, 6)}</span><span className="text-xs text-white/50">{i === 0 ? "Shine Wallet" : "Imported"}</span>
              </button>
            ))}
          </div>
        </Card>
      )}

      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <button onClick={() => exportWallet({ address }).catch(() => {})} className="glass rounded-full px-3 py-1.5 font-semibold text-white/70 hover:text-white">Export private key</button>
        <a href={solscanAccount(address)} target="_blank" rel="noopener noreferrer" className="glass inline-flex items-center gap-1 rounded-full px-3 py-1.5 font-semibold text-white/70 hover:text-white">View on Solscan {ICON.external}</a>
      </div>

      <section className="mt-7">
        <h2 className="mb-3 font-display text-lg font-bold">Transaction history</h2>
        {hist === null ? <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-16 rounded-2xl" />)}</div>
          : histErr ? <p className="glass rounded-2xl p-4 text-sm text-white/60">{histErr}</p>
          : !hist.length ? <p className="glass rounded-2xl p-5 text-center text-sm text-white/55">No transactions yet. Deposit SOL or get paid by a project to get started.</p>
          : (
            <div className="space-y-2">
              {hist.map((h, i) => (
                <motion.a key={h.signature} href={solscanTx(h.signature)} target="_blank" rel="noopener noreferrer" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 10) * 0.03 }}
                  className="glass flex items-center gap-3 rounded-2xl p-3 hover:border-pink/40">
                  <span className={`flex h-10 w-10 items-center justify-center rounded-full ${h.status === "failed" ? "bg-red-500/15 text-red-300" : h.kind === "received" ? "bg-emerald-400/15 text-emerald-300" : "icon-grad text-pink"} neu-sm`}>
                    {h.kind === "received" ? ICON.arrowDown : ICON.arrowUp}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{labels[h.signature] || (h.status === "failed" ? "Failed transaction" : h.kind === "received" ? "Received" : h.kind === "sent" ? "Sent" : "Transaction")}</p>
                    <p className="truncate text-xs text-white/45">{h.counterparty ? `${h.kind === "received" ? "From" : "To"} ${short(h.counterparty, 4)} · ` : ""}{h.time ? new Date(h.time).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "Pending"}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-semibold ${h.delta > 0 ? "text-emerald-300" : "text-white"}`}>{h.delta > 0 ? "+" : ""}{fmtSol(h.delta, 6)} SOL</p>
                    {usd && h.delta !== 0 && <p className="text-xs text-white/40">{fmtUsd(Math.abs(h.delta) * usd)}</p>}
                  </div>
                </motion.a>
              ))}
            </div>
          )}
      </section>

      <ReceiveSheet open={sheet === "receive"} onClose={() => setSheet(null)} address={address} />

      <ImportSheet open={sheet === "import"} onClose={() => setSheet(null)} onResult={(r) => { setSheet(null); setStatus(r); }} />
      <StatusOverlay kind={status?.kind ?? null} title={status?.title} message={status?.msg} onClose={() => setStatus(null)} />
    </>
  );
}

type Result = { kind: "success" | "failed" | "denied"; title: string; msg?: React.ReactNode };

function ReceiveSheet({ open, onClose, address }: { open: boolean; onClose: () => void; address: string }) {
  const toast = useToast();
  return (
    <BottomSheet open={open} onClose={onClose} title="Receive SOL">
      <div className="flex flex-col items-center pb-4 text-center">
        <motion.div initial={{ scale: 0.85, opacity: 0, rotate: -4 }} animate={{ scale: 1, opacity: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.1 }}
          className="relative rounded-[1.75rem] bg-white p-4 shadow-[var(--raise-sm)]">
          <QRCodeSVG value={address} size={196} level="H" marginSize={0} fgColor="#0b0610" imageSettings={{ src: "/brand/star-192.png", height: 46, width: 46, excavate: true }} />
        </motion.div>
        <p className="mt-4 text-sm text-white/65">Send only <span className="font-semibold text-white">SOL</span> on the <span className="font-semibold text-white">Solana</span> network to this address.</p>
        <div className="mt-3 flex w-full items-center gap-2 rounded-2xl bg-white/[.05] p-2 pl-4">
          <p className="min-w-0 flex-1 break-all text-left font-mono text-[13px] text-white/85">{address}</p>
          <Button size="sm" onClick={() => { navigator.clipboard.writeText(address); toast("Address copied", "ok"); }}>{ICON.copy} Copy</Button>
        </div>
      </div>
    </BottomSheet>
  );
}

function ImportSheet({ open, onClose, onResult }: { open: boolean; onClose: () => void; onResult: (r: Result) => void }) {
  const [mode, setMode] = useState<"key" | "seed">("key");
  const [val, setVal] = useState("");
  const [busy, setBusy] = useState(false);
  const { importWallet } = useImportWallet();
  const { importSeedPhrase } = useImportSeedPhrase();
  const { setActiveAddress } = useSession();
  useEffect(() => { if (!open) setVal(""); }, [open]);
  const words = val.trim().split(/\s+/).filter(Boolean).length;
  const valid = mode === "key" ? /^[1-9A-HJ-NP-Za-km-z]{80,100}$/.test(val.trim()) : [12, 15, 18, 21, 24].includes(words);
  const go = async () => {
    setBusy(true);
    try {
      const w: any = mode === "key" ? await importWallet({ privateKey: val.trim() }) : (await importSeedPhrase({ mnemonic: val.trim().toLowerCase().split(/\s+/).join(" "), chainType: "solana" })).wallet;
      if (w?.address) setActiveAddress(w.address);
      onResult({ kind: "success", title: "Wallet imported", msg: `Your wallet ${w?.address ? short(w.address, 5) + " " : ""}is now available in Shine and set as active.` });
    } catch (e) {
      const k = errorKind(e);
      onResult({ kind: k, title: k === "denied" ? "Import cancelled" : "Import failed", msg: friendlyError(e) });
    }
    setVal(""); setBusy(false);
  };
  return (
    <Sheet open={open} onClose={() => !busy && onClose()} title="Import wallet">
      <div className="space-y-4">
        <Segmented value={mode} onChange={(m) => { setMode(m); setVal(""); }} options={[{ value: "key", label: "Private key" }, { value: "seed", label: "Seed phrase" }]} />
        <textarea value={val} onChange={(e) => setVal(e.target.value)} rows={mode === "key" ? 3 : 4} className="input font-mono text-sm" autoCapitalize="off" autoCorrect="off" spellCheck={false}
          placeholder={mode === "key" ? "Base58 private key (e.g. exported from Phantom)" : "12 or 24 word recovery phrase, separated by spaces"} />
        <p className="text-xs text-white/45">Your key is handed directly to Privy's secure wallet infrastructure — it is never stored by Shine or sent to Shine's servers. One imported wallet is supported per account.</p>
        <Button size="lg" className="w-full" loading={busy} disabled={!valid} onClick={go}>Import wallet</Button>
      </div>
    </Sheet>
  );
}

export default function WalletPage() {
  return <SessionGate needProfile={false} allowDeactivated text="Sign in to access your Shine Wallet."><Inner /></SessionGate>;
}
