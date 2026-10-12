import "server-only";
import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import bs58 from "bs58";
import { createPublicKey, verify as edVerify } from "crypto";
import { HttpError } from "./server-admin";

export const LAMPORTS = LAMPORTS_PER_SOL;
const RPC = process.env.SOLANA_RPC_URL || "https://solana-rpc.publicnode.com";
let _conn: Connection | null = null;
export const conn = () => (_conn ??= new Connection(RPC, "confirmed"));

/** Escrow vault keypair, loaded from the ESCROW_PRIVATE_KEY server env var (base58 64-byte secret or JSON byte array). Rotate by changing the env var. */
let _vault: Keypair | null = null;
export function vault(): Keypair {
  if (_vault) return _vault;
  const raw = (process.env.ESCROW_PRIVATE_KEY || "").trim();
  if (!raw) throw new HttpError(503, "The Shine escrow vault is not configured.");
  const bytes = raw.startsWith("[") ? Uint8Array.from(JSON.parse(raw)) : bs58.decode(raw);
  _vault = Keypair.fromSecretKey(bytes);
  return _vault;
}
export const vaultAddress = () => vault().publicKey.toBase58();
/** Where verification payments go (defaults to the vault's own address). */
export const treasuryAddress = () => process.env.VERIFY_TREASURY || vaultAddress();

let priceCache: { usd: number; at: number } | null = null;
export async function solUsd(): Promise<number> {
  if (priceCache && Date.now() - priceCache.at < 60_000) return priceCache.usd;
  const tries = [
    async () => (await (await fetch("https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd", { cache: "no-store" })).json())?.solana?.usd,
    async () => (await (await fetch("https://lite-api.jup.ag/price/v3?ids=So11111111111111111111111111111111111111112", { cache: "no-store" })).json())?.So11111111111111111111111111111111111111112?.usdPrice,
  ];
  for (const t of tries) { try { const v = Number(await t()); if (v > 0) { priceCache = { usd: v, at: Date.now() }; return v; } } catch {} }
  throw new HttpError(503, "The SOL price is unavailable right now. Please try again in a minute.");
}
export const usdToLamports = (usd: number, price: number) => Math.round((usd / price) * LAMPORTS);

/** Verify an ed25519 signature (base58) by a Solana address over a UTF-8 message. */
export function verifySolSignature(message: string, sigB58: string, address: string) {
  try {
    const pub = new PublicKey(address).toBytes();
    const key = createPublicKey({ key: Buffer.concat([Buffer.from("302a300506032b6570032100", "hex"), Buffer.from(pub)]), format: "der", type: "spki" });
    return edVerify(null, Buffer.from(message, "utf8"), key, Buffer.from(bs58.decode(sigB58)));
  } catch { return false; }
}

/** Verify a confirmed on-chain SOL transfer to `to` of at least `minLamports` (optionally from `from`, optionally including a Solana Pay reference key). */
export async function verifyTransfer(sig: string, o: { to: string; minLamports: number; from?: string[]; reference?: string }) {
  let tx = null;
  for (let i = 0; i < 8 && !tx; i++) {
    tx = await conn().getParsedTransaction(sig, { maxSupportedTransactionVersion: 0, commitment: "confirmed" }).catch(() => null);
    if (!tx) await new Promise((r) => setTimeout(r, 1500));
  }
  if (!tx) throw new HttpError(409, "The transaction isn't confirmed yet. Please retry in a few seconds.");
  if (tx.meta?.err) throw new HttpError(400, "That transaction failed on-chain.");
  const keys = tx.transaction.message.accountKeys.map((k) => k.pubkey.toBase58());
  if (o.reference && !keys.includes(o.reference)) throw new HttpError(400, "The payment reference doesn't match.");
  let total = 0, source = "";
  for (const ix of tx.transaction.message.instructions as any[]) {
    const p = ix.parsed;
    if (ix.program === "system" && p?.type === "transfer" && p.info?.destination === o.to) {
      if (o.from && !o.from.includes(p.info.source)) continue;
      total += Number(p.info.lamports); source = p.info.source;
    }
  }
  if (total < o.minLamports) throw new HttpError(400, "The on-chain amount or destination doesn't match this payment.");
  return { lamports: total, source, blockTime: tx.blockTime };
}

/** Find the first confirmed transaction that includes a Solana Pay reference key. */
export async function findByReference(reference: string) {
  const sigs = await conn().getSignaturesForAddress(new PublicKey(reference), { limit: 5 }, "confirmed");
  return sigs.find((s) => !s.err)?.signature || null;
}

/** Send SOL from the vault (optionally with extra legs in the same transaction, e.g. a fee). */
export async function sendFromVault(to: string, lamports: number, extra: { to: string; lamports: number }[] = []) {
  const kp = vault();
  const tx = new Transaction().add(SystemProgram.transfer({ fromPubkey: kp.publicKey, toPubkey: new PublicKey(to), lamports }));
  for (const x of extra) if (x.lamports > 0 && x.to !== kp.publicKey.toBase58()) tx.add(SystemProgram.transfer({ fromPubkey: kp.publicKey, toPubkey: new PublicKey(x.to), lamports: x.lamports }));
  return sendAndConfirmTransaction(conn(), tx, [kp], { commitment: "confirmed" });
}
export const vaultBalance = async () => (await conn().getBalance(vault().publicKey, "confirmed")) / LAMPORTS;
