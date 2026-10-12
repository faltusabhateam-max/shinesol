"use client";
import { useSignSend } from "@/lib/client-api";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { PublicKey } from "@solana/web3.js";
import { SessionGate } from "@/components/gate";
import { useSession } from "@/components/providers";
import { BackLink, Button, Card } from "@/components/ui";
import { ICON } from "@/components/icons";
import { StatusOverlay, errorKind, friendlyError } from "@/components/status";
import { useConfirm, UserRejectedError } from "@/components/confirm";
import { FEE_BPS, FEE_WALLET, MIN_WITHDRAW_USD } from "@/lib/config";
import { recordLedger } from "@/lib/ledger-client";
import { fmtSol, fmtUsd, short } from "@/lib/format";
import { preflight, buildTransfer, connection, getBalance, LAMPORTS, sigToString, solscanTx, waitForConfirmation } from "@/lib/solana";
import { usePrice } from "@/lib/use-price";

const NET_FEE = 5000;
const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
function validPubkey(a: string) {
  if (!BASE58.test(a)) return false;
  try { return new PublicKey(a).toBytes().length === 32; } catch { return false; }
}

function SendScreen() {
  const { address, wallet } = useSession();
  const { usd } = usePrice();
  const confirm = useConfirm();
  const router = useRouter();
  const signSend = useSignSend();
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [isMax, setIsMax] = useState(false);
  const [bal, setBal] = useState<number | null>(null);
  const [rentMin, setRentMin] = useState(890880);
  const [feeWalletBal, setFeeWalletBal] = useState<number | null>(null);
  const [toBal, setToBal] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ kind: "success" | "failed" | "denied"; title: string; msg?: React.ReactNode } | null>(null);

  useEffect(() => {
    if (!address) return;
    getBalance(address).then(setBal).catch(() => setBal(null));
    connection().getMinimumBalanceForRentExemption(0).then(setRentMin).catch(() => {});
    connection().getBalance(new PublicKey(FEE_WALLET)).then(setFeeWalletBal).catch(() => setFeeWalletBal(null));
  }, [address]);
  const addrOk = validPubkey(to.trim());
  useEffect(() => { setToBal(null); if (addrOk) connection().getBalance(new PublicKey(to.trim())).then(setToBal).catch(() => {}); }, [to, addrOk]);

  const balL = bal != null ? Math.round(bal * LAMPORTS) : 0;
  const maxL = Math.max(0, Math.floor(((balL - NET_FEE) * 10_000) / (10_000 + FEE_BPS)));
  const calc = useMemo(() => {
    let lamports = Math.floor(Number(amount || 0) * LAMPORTS);
    let fee = Math.ceil((lamports * FEE_BPS) / 10_000);
    if (isMax) { lamports = maxL; fee = Math.max(0, balL - NET_FEE - lamports); }
    const total = lamports + fee + NET_FEE;
    return { lamports, fee, total, remaining: balL - total };
  }, [amount, isMax, balL, maxL]);
  const amtSol = calc.lamports / LAMPORTS;
  const amtUsd = usd ? amtSol * usd : null;

  const errors: string[] = [];
  if (to && !addrOk) errors.push("This is not a valid Solana address.");
  if (to.trim() && to.trim() === address) errors.push("You can't send to your own wallet.");
  if (calc.lamports > 0) {
    if (!usd) errors.push("Live SOL price is unavailable, so the $2 minimum can't be verified. Please try again shortly.");
    else if (amtUsd! < MIN_WITHDRAW_USD) errors.push(`Minimum withdrawal is ${fmtUsd(MIN_WITHDRAW_USD)} (≈ ${fmtSol(MIN_WITHDRAW_USD / usd, 4)} SOL).`);
    if (calc.remaining < 0) errors.push("Insufficient balance to cover the amount, Shine fee and network fee.");
    else if (calc.remaining > 0 && calc.remaining < rentMin) errors.push(`Leave at least ${fmtSol(rentMin / LAMPORTS, 5)} SOL in your wallet, or tap Max to send everything.`);
    if (toBal === 0 && calc.lamports < rentMin) errors.push(`New wallets must receive at least ${fmtSol(rentMin / LAMPORTS, 5)} SOL.`);
    if (feeWalletBal === 0 && calc.fee > 0 && calc.fee < rentMin) errors.push("Withdrawals are temporarily unavailable while the Shine fee account is being activated. Please try again later.");
  }
  const ready = addrOk && to.trim() !== address && calc.lamports > 0 && errors.length === 0 && !!wallet;

  const send = async () => {
    if (!ready || !address) return;
    setBusy(true);
    try {
      const dest = to.trim();
      const { bytes, networkFee, lastValidBlockHeight } = await buildTransfer(address, dest, calc.lamports, { to: FEE_WALLET, lamports: calc.fee });
      await preflight(bytes, { from: address, to: dest, spend: calc.lamports + calc.fee, networkFee });
      const ok = await confirm({
        kind: "transaction",
        title: "Confirm withdrawal",
        subtitle: "Review the details before approving.",
        amount: `${fmtSol(amtSol, 6)} SOL`,
        amountSub: amtUsd != null ? `≈ ${fmtUsd(amtUsd)}` : undefined,
        rows: [
          ["To", <span key="to" className="font-mono">{short(dest, 6)}</span>],
          ["Recipient receives", `${fmtSol(amtSol, 6)} SOL`],
          [`Shine fee (${FEE_BPS / 100}%)`, `${fmtSol(calc.fee / LAMPORTS, 6)} SOL`],
          ["Network fee", `~${fmtSol(networkFee / LAMPORTS, 6)} SOL`],
          ["Total deducted", `${fmtSol((calc.lamports + calc.fee + networkFee) / LAMPORTS, 6)} SOL`],
        ],
        warning: "Solana transactions are irreversible. Only send to a Solana (SOL) wallet address.",
        confirmLabel: "Confirm & send",
      });
      if (!ok) throw new UserRejectedError();
      const sig = await signSend(bytes, lastValidBlockHeight);
      recordLedger(sig, "withdraw");
      setStatus({ kind: "success", title: "SOL sent", msg: <>{fmtSol(amtSol)} SOL is on its way to {short(dest, 4)}. <a className="text-pink underline" href={solscanTx(sig)} target="_blank" rel="noopener noreferrer">View on Solscan</a></> });
      setTo(""); setAmount(""); setIsMax(false);
      getBalance(address).then(setBal).catch(() => {});
    } catch (e) {
      const k = errorKind(e);
      setStatus({ kind: k, title: k === "denied" ? "Transaction rejected" : "Transaction failed", msg: k === "denied" ? "You rejected the transaction. No funds were moved." : friendlyError(e) });
    }
    setBusy(false);
  };

  const Row = ({ l, v, strong }: { l: string; v: string; strong?: boolean }) => <div className={`flex justify-between py-1.5 text-sm ${strong ? "mt-1 border-t border-white/10 pt-3 font-semibold text-white" : "text-white/65"}`}><span>{l}</span><span>{v}</span></div>;

  return (
    <div className="space-y-4">
      <BackLink href="/wallet" label="Wallet" />
      <div>
        <h1 className="font-display text-3xl font-semibold">Send SOL</h1>
        <p className="mt-1 text-sm text-white/55">Withdraw from your Shine Wallet to any Solana address.</p>
      </div>

      <Card className="p-5">
        <label className="label" htmlFor="to">Recipient address</label>
        <div className="relative">
          <input id="to" value={to} onChange={(e) => setTo(e.target.value.replace(/\s/g, ""))} placeholder="Enter a Solana wallet address" autoCapitalize="off" autoCorrect="off" spellCheck={false}
            className={`input !pr-20 font-mono text-sm ${to && !addrOk ? "!border-red-400/60" : addrOk ? "!border-emerald-400/50" : ""}`} />
          <button type="button" onClick={async () => { try { setTo((await navigator.clipboard.readText()).trim()); } catch {} }} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl bg-white/10 px-3 py-1.5 text-xs font-semibold hover:bg-white/15">Paste</button>
        </div>
        <p className={`mt-1.5 text-xs ${to && !addrOk ? "text-red-300" : addrOk ? "text-emerald-300" : "text-white/40"}`}>{to ? (addrOk ? "✓ Valid Solana address" : "Invalid Solana address") : "Base58 Solana public key (32–44 characters)"}</p>

        <div className="mt-5 flex items-end justify-between">
          <label className="label" htmlFor="amt">Amount</label>
          <button type="button" onClick={() => { setIsMax(true); setAmount(String(maxL / LAMPORTS)); }} className="mb-1.5 rounded-full bg-pink/15 px-2.5 py-0.5 text-xs font-semibold text-pink ring-1 ring-pink/40 hover:bg-pink/25">Max</button>
        </div>
        <div className="relative">
          <input id="amt" value={amount} onChange={(e) => { setIsMax(false); setAmount(e.target.value.replace(/[^0-9.]/g, "")); }} inputMode="decimal" placeholder="0.00" className="input !py-4 !pr-16 !text-3xl font-semibold" />
          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 font-semibold text-pink">SOL</span>
        </div>
        <p className="mt-1.5 flex justify-between text-xs text-white/50"><span>{amtUsd != null && calc.lamports ? `≈ ${fmtUsd(amtUsd)}` : `Minimum ${fmtUsd(MIN_WITHDRAW_USD)}`}</span><span>Available: {bal == null ? "…" : `${fmtSol(bal, 4)} SOL`}</span></p>
      </Card>

      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} role="alert" className="flex gap-3 rounded-3xl border border-amber-300/30 bg-amber-300/[.08] p-4">
        <span className="mt-0.5 text-amber-300">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4M12 17h.01" /></svg>
        </span>
        <p className="text-sm leading-relaxed text-amber-50/90">
          <span className="font-semibold text-amber-200">Only send to a Solana (SOL) wallet address.</span> Sending to an address on another chain may result in permanent loss of funds. Double-check the address before sending.
        </p>
      </motion.div>

      {calc.lamports > 0 && (
        <Card className="px-5 py-3">
          <Row l="Recipient receives" v={`${fmtSol(amtSol, 6)} SOL`} />
          <Row l={`Shine fee (${FEE_BPS / 100}%)`} v={`${fmtSol(calc.fee / LAMPORTS, 6)} SOL`} />
          <Row l="Network fee" v={`~${fmtSol(NET_FEE / LAMPORTS, 6)} SOL`} />
          <Row l="Total deducted" v={`${fmtSol(calc.total / LAMPORTS, 6)} SOL`} strong />
        </Card>
      )}
      {errors.length > 0 && calc.lamports > 0 && <div className="space-y-1 px-1">{errors.map((e) => <p key={e} className="text-sm text-red-300/90">{e}</p>)}</div>}

      <Button size="lg" className="w-full" loading={busy} disabled={!ready} onClick={send}>{busy ? "Processing…" : "Send"}</Button>
      <p className="text-center text-xs text-white/40">A {FEE_BPS / 100}% Shine fee applies to withdrawals and is sent to the Shine vault <Link href={`https://solscan.io/account/${FEE_WALLET}`} target="_blank" className="underline">{short(FEE_WALLET, 4)}</Link> in the same transaction.</p>
      <StatusOverlay kind={status?.kind ?? null} title={status?.title} message={status?.msg} onClose={() => { const ok = status?.kind === "success"; setStatus(null); if (ok) router.push("/wallet"); }} />
    </div>
  );
}

export default function SendPage() {
  return <SessionGate needProfile={false} allowDeactivated text="Sign in to send SOL from your Shine Wallet."><SendScreen /></SessionGate>;
}
