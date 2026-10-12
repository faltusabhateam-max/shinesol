"use client";
import { useMemo, useState } from "react";
import { ConnectionProvider, WalletProvider, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { motion } from "framer-motion";
import { connection } from "@/lib/solana";
import { short } from "@/lib/format";
import { Button } from "./ui";
import { friendlyError } from "./status";

/** Wallet-adapter (Wallet Standard) connect for Phantom, Solflare & other Solana wallets. */
export function ExternalWalletProvider({ children }: { children: React.ReactNode }) {
  const endpoint = typeof window !== "undefined" ? `${window.location.origin}/api/rpc` : "https://shinesol.vercel.app/api/rpc";
  const wallets = useMemo(() => [], []);
  return <ConnectionProvider endpoint={endpoint}><WalletProvider wallets={wallets} autoConnect={false}>{children}</WalletProvider></ConnectionProvider>;
}

export function ExternalPay({ recipient, lamports, reference, onSent, label }: { recipient: string; lamports: number; reference: string; onSent: (sig: string) => void; label: string }) {
  const { wallets, wallet, select, connect, publicKey, sendTransaction, disconnect, connecting } = useWallet();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const detected = wallets.filter((w) => w.readyState === "Installed" || w.readyState === "Loadable");
  const pay = async () => {
    if (!publicKey) return;
    setBusy(true); setErr(null);
    try {
      const c = connection();
      const ix = SystemProgram.transfer({ fromPubkey: publicKey, toPubkey: new PublicKey(recipient), lamports });
      ix.keys.push({ pubkey: new PublicKey(reference), isSigner: false, isWritable: false });
      const tx = new Transaction().add(ix);
      const { blockhash } = await c.getLatestBlockhash("confirmed");
      tx.recentBlockhash = blockhash; tx.feePayer = publicKey;
      const bal = await c.getBalance(publicKey, "confirmed").catch(() => null);
      if (bal != null && bal < lamports + 5000) throw new Error(`Insufficient SOL in this wallet. You need ${((lamports + 5000) / 1e9).toFixed(6)} SOL including the network fee.`);
      onSent(await sendTransaction(tx, c));
    } catch (e: any) { setErr(/^Insufficient SOL in this wallet/.test(e?.message || "") ? e.message : friendlyError(e)); }
    setBusy(false);
  };
  if (publicKey) return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[.03] px-3 py-2.5 text-sm">
        {wallet?.adapter.icon && <img src={wallet.adapter.icon} alt="" className="h-6 w-6 rounded-md" />}
        <span className="flex-1 font-semibold">{wallet?.adapter.name}</span><span className="font-mono text-xs text-white/55">{short(publicKey.toBase58(), 4)}</span>
        <button className="text-xs text-white/45 hover:text-white" onClick={() => disconnect()}>Disconnect</button>
      </div>
      <Button className="w-full" loading={busy} onClick={pay}>{label}</Button>
      {err && <p className="text-center text-xs text-red-300">{err}</p>}
    </div>
  );
  return (
    <div className="space-y-2">
      {detected.length ? (
        <div className="grid grid-cols-2 gap-2">
          {detected.map((w) => (
            <motion.button key={w.adapter.name} whileTap={{ scale: 0.96 }} disabled={connecting} onClick={async () => { try { select(w.adapter.name); await new Promise((r) => setTimeout(r, 50)); await connect(); } catch (e: any) { setErr(e?.message || "Couldn't connect."); } }}
              className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[.04] p-3 text-sm font-semibold hover:border-pink/40">
              <img src={w.adapter.icon} alt="" className="h-6 w-6 rounded-md" />{w.adapter.name}
            </motion.button>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {[["Phantom", "https://phantom.app/ul/browse/", "#ab9ff2"], ["Solflare", "https://solflare.com/ul/v1/browse/", "#fc7227"]].map(([n, u, c]) => (
            <a key={n} href={`${u}${encodeURIComponent(typeof window !== "undefined" ? window.location.href : "https://shinesol.vercel.app/verify")}?ref=${encodeURIComponent("https://shinesol.vercel.app")}`}
              className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[.04] p-3 text-sm font-semibold hover:border-pink/40">
              <span className="h-6 w-6 rounded-md" style={{ background: c }} />Open in {n}
            </a>
          ))}
        </div>
      )}
      <p className="text-center text-[11px] text-white/40">{detected.length ? "Connect a Solana wallet to pay from this device." : "No browser wallet detected — scan the QR code or open Shine inside your wallet app."}</p>
      {err && <p className="text-center text-xs text-red-300">{err}</p>}
    </div>
  );
}
