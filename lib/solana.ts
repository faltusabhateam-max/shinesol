"use client";
import { Connection, PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL, type ParsedTransactionWithMeta } from "@solana/web3.js";
import bs58 from "bs58";

let conn: Connection | null = null;
export function connection() {
  if (!conn) {
    const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
    conn = new Connection(`${origin}/api/rpc`, { commitment: "confirmed", disableRetryOnRateLimit: false });
  }
  return conn;
}
export const LAMPORTS = LAMPORTS_PER_SOL;
export function isValidAddress(a: string) {
  try {
    const k = new PublicKey(a.trim());
    return PublicKey.isOnCurve(k.toBytes()) || a.trim().length >= 32;
  } catch {
    return false;
  }
}
export async function getBalance(address: string) {
  return (await connection().getBalance(new PublicKey(address), "confirmed")) / LAMPORTS_PER_SOL;
}

export type HistoryItem = {
  signature: string;
  time: number | null;
  delta: number; // SOL, signed, from perspective of address
  fee: number;
  status: "success" | "failed";
  counterparty?: string;
  kind: "received" | "sent" | "other";
};

export async function getHistory(address: string, limit = 25): Promise<HistoryItem[]> {
  const c = connection();
  const pk = new PublicKey(address);
  const sigs = await c.getSignaturesForAddress(pk, { limit });
  if (!sigs.length) return [];
  const txs: (ParsedTransactionWithMeta | null)[] = [];
  for (let i = 0; i < sigs.length; i += 10) {
    const chunk = await c.getParsedTransactions(sigs.slice(i, i + 10).map((s) => s.signature), { maxSupportedTransactionVersion: 0, commitment: "confirmed" });
    txs.push(...chunk);
  }
  return sigs.map((s, i) => {
    const tx = txs[i];
    let delta = 0, fee = 0, counterparty: string | undefined;
    if (tx?.meta) {
      const keys = tx.transaction.message.accountKeys.map((k) => k.pubkey.toBase58());
      const idx = keys.indexOf(address);
      if (idx >= 0) delta = (tx.meta.postBalances[idx] - tx.meta.preBalances[idx]) / LAMPORTS_PER_SOL;
      fee = tx.meta.fee / LAMPORTS_PER_SOL;
      for (const ix of tx.transaction.message.instructions) {
        const p = (ix as any).parsed;
        if (p?.type === "transfer" && p.info?.lamports) {
          if (p.info.source === address && p.info.destination !== address) { counterparty = p.info.destination; break; }
          if (p.info.destination === address) { counterparty = p.info.source; break; }
        }
      }
    }
    return {
      signature: s.signature,
      time: s.blockTime ? s.blockTime * 1000 : null,
      delta,
      fee,
      status: s.err ? "failed" : "success",
      counterparty,
      kind: delta > 0 ? "received" : delta < 0 ? "sent" : "other",
    } as HistoryItem;
  });
}

/** Build an unsigned SOL transfer. Optional fee leg goes to the fee wallet in the same transaction. */
export async function buildTransfer(from: string, to: string, lamports: number, fee?: { to: string; lamports: number } | null, reference?: string) {
  const c = connection();
  const fromPk = new PublicKey(from);
  const tx = new Transaction();
  const ix = SystemProgram.transfer({ fromPubkey: fromPk, toPubkey: new PublicKey(to), lamports });
  if (reference) ix.keys.push({ pubkey: new PublicKey(reference), isSigner: false, isWritable: false });
  tx.add(ix);
  if (fee && fee.lamports > 0) tx.add(SystemProgram.transfer({ fromPubkey: fromPk, toPubkey: new PublicKey(fee.to), lamports: fee.lamports }));
  const { blockhash, lastValidBlockHeight } = await c.getLatestBlockhash("confirmed");
  tx.recentBlockhash = blockhash;
  tx.feePayer = fromPk;
  const networkFee = (await c.getFeeForMessage(tx.compileMessage(), "confirmed")).value ?? 5000;
  return { bytes: new Uint8Array(tx.serialize({ requireAllSignatures: false, verifySignatures: false })), networkFee, lastValidBlockHeight };
}

export const RENT_MIN = 890_880; // rent-exempt minimum for a 0-byte system account

/** Human-readable transaction error. Never throws on odd shapes. */
export class TxError extends Error { constructor(msg: string, public code: string) { super(msg); this.name = "TxError"; } }

/** Preflight before asking the user to sign: balance, rent and a simulation with the program logs. */
export async function preflight(bytes: Uint8Array, o: { from: string; to?: string; spend: number; networkFee: number }) {
  const c = connection();
  let bal: number;
  try { bal = await c.getBalance(new PublicKey(o.from), "confirmed"); }
  catch { throw new TxError("The Solana network is busy right now. Please try again in a moment.", "rpc"); }
  const need = o.spend + o.networkFee;
  if (bal < need) throw new TxError(`Insufficient SOL. You need ${(need / LAMPORTS_PER_SOL).toFixed(6)} SOL (amount + network fee) but have ${(bal / LAMPORTS_PER_SOL).toFixed(6)} SOL.`, "insufficient");
  const left = bal - need;
  if (left > 0 && left < RENT_MIN) throw new TxError(`This would leave ${(left / LAMPORTS_PER_SOL).toFixed(6)} SOL, below Solana's rent-exempt minimum (${(RENT_MIN / LAMPORTS_PER_SOL).toFixed(6)} SOL). Send everything (Max) or leave at least ${(RENT_MIN / LAMPORTS_PER_SOL).toFixed(6)} SOL.`, "rent");
  if (o.to) {
    const dest = await c.getBalance(new PublicKey(o.to), "confirmed").catch(() => null);
    if (dest === 0 && o.spend < RENT_MIN) throw new TxError(`The recipient's wallet is new, so the first transfer must be at least ${(RENT_MIN / LAMPORTS_PER_SOL).toFixed(6)} SOL (Solana rent minimum).`, "min");
  }
  try {
    const tx = Transaction.from(bytes);
    const sim: any = await c.simulateTransaction(tx);
    const v = sim?.value;
    if (v?.err) throw new TxError(simReason(v.err, v.logs), "simulation");
  } catch (e: any) {
    if (e instanceof TxError) throw e;
    // Simulation RPC failure is not fatal: the balance checks above already passed.
  }
}
function simReason(err: any, logs?: string[] | null) {
  const s = JSON.stringify(err || "");
  const log = (logs || []).find((l) => /insufficient|error|failed/i.test(l)) || "";
  if (/InsufficientFunds|insufficient lamports|"Custom":1\b/i.test(s + log)) return "Insufficient SOL to cover this amount plus network fees.";
  if (/InsufficientFundsForRent/i.test(s)) return "This transfer would leave an account below Solana's rent-exempt minimum.";
  if (/BlockhashNotFound/i.test(s)) return "The transaction expired before it was sent. Please try again.";
  if (/AccountNotFound/i.test(s)) return "Your Shine Wallet has no SOL yet. Deposit SOL first.";
  return `The network rejected this transaction${log ? `: ${log.replace(/^Program log:\s*/i, "").slice(0, 120)}` : "."}`;
}

/** Broadcast signed bytes and wait for confirmation. */
export async function sendSigned(signed: Uint8Array, lastValidBlockHeight?: number) {
  const c = connection();
  let sig: string;
  try { sig = await c.sendRawTransaction(signed, { skipPreflight: true, maxRetries: 3 }); }
  catch (e: any) { throw new TxError(friendlySendError(e), "send"); }
  await waitForConfirmation(sig, 75_000, lastValidBlockHeight);
  return sig;
}
function friendlySendError(e: any) {
  const m = String(e?.message || e || "");
  if (/blockhash not found|expired/i.test(m)) return "The transaction expired before it was sent. Please try again.";
  if (/insufficient/i.test(m)) return "Insufficient SOL to cover this amount plus network fees.";
  if (/429|rate|busy|fetch|network|unavailable/i.test(m)) return "The Solana network is busy right now. Please try again in a moment.";
  return "The transaction couldn't be sent. Please try again.";
}

export async function waitForConfirmation(signature: string, timeoutMs = 60_000, lastValidBlockHeight?: number) {
  const c = connection();
  const start = Date.now();
  let i = 0;
  while (Date.now() - start < timeoutMs) {
    try {
      const res: any = await c.getSignatureStatuses([signature], { searchTransactionHistory: true });
      const st = res?.value?.[0];
      if (st?.err) throw new TxError(simReason(st.err), "onchain");
      if (st && (st.confirmationStatus === "confirmed" || st.confirmationStatus === "finalized")) return true;
      if (lastValidBlockHeight && ++i % 4 === 0) {
        const h = await c.getBlockHeight("confirmed").catch(() => 0);
        if (h > lastValidBlockHeight) throw new TxError("The transaction expired before it was confirmed. No funds were moved. Please try again.", "expired");
      }
    } catch (e) { if (e instanceof TxError) throw e; /* transient RPC error: keep polling */ }
    await new Promise((r) => setTimeout(r, 1500));
  }
  throw new TxError(`Confirmation is taking longer than expected. Check Solscan for the final status: ${signature.slice(0, 8)}…`, "timeout");
}

export const sigToString = (sig: Uint8Array | string) => (typeof sig === "string" ? sig : bs58.encode(sig));
export const solscanTx = (sig: string) => `https://solscan.io/tx/${sig}`;
export const solscanAccount = (a: string) => `https://solscan.io/account/${a}`;

/** Verify an ed25519 wallet signature (base58 or base64) over a UTF-8 message. */
export async function verifySignature(message: string, signature: string, address: string): Promise<boolean> {
  try {
    const { ed25519 } = await import("@noble/curves/ed25519");
    let sig: Uint8Array;
    try { sig = bs58.decode(signature); } catch { sig = Uint8Array.from(atob(signature), (c) => c.charCodeAt(0)); }
    if (sig.length !== 64) sig = Uint8Array.from(atob(signature), (c) => c.charCodeAt(0));
    return ed25519.verify(sig, new TextEncoder().encode(message), new PublicKey(address).toBytes());
  } catch { return false; }
}
