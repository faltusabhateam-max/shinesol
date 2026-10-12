"use client";
import { useCallback } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useSignMessage, useSignTransaction } from "@privy-io/react-auth/solana";
import { useSession } from "@/components/providers";
import { useConfirm, UserRejectedError, type ConfirmOptions } from "@/components/confirm";
import { buildTransfer, LAMPORTS, preflight, sendSigned, sigToString } from "./solana";

/** POST to a Shine API route with the caller's Privy access token. */
export function useApi() {
  const { getAccessToken } = usePrivy();
  return useCallback(async <T = any>(path: string, body: Record<string, any>): Promise<T> => {
    const token = await getAccessToken();
    const r = await fetch(path, { method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || "Request failed. Please try again.");
    return j as T;
  }, [getAccessToken]);
}

/** Sign with the Shine Wallet (Privy, no UI) and broadcast/confirm via Shine's RPC with robust polling. */
export function useSignSend() {
  const { wallet } = useSession();
  const { signTransaction } = useSignTransaction();
  return useCallback(async (bytes: Uint8Array, lastValidBlockHeight?: number) => {
    if (!wallet) throw new Error("Your Shine Wallet is still loading.");
    const out: any = await signTransaction({ transaction: bytes, wallet, chain: "solana:mainnet", options: { uiOptions: { showWalletUIs: false } } } as any);
    const signed: Uint8Array | undefined = out?.signedTransaction;
    if (!signed) throw new Error("Your wallet didn't return a signed transaction. Please try again.");
    return sendSigned(signed, lastValidBlockHeight);
  }, [wallet, signTransaction]);
}

/** Shine-wallet actions that always go through Shine's own confirm sheet. */
export function useShineWallet() {
  const { wallet, address } = useSession();
  const confirm = useConfirm();
  const { signMessage } = useSignMessage();
  const signSend = useSignSend();
  const sign = useCallback(async (message: string, o: Omit<ConfirmOptions, "kind" | "message">) => {
    if (!wallet) throw new Error("Your Shine Wallet is still loading.");
    if (!(await confirm({ ...o, kind: "sign", message }))) throw new UserRejectedError();
    const { signature } = await signMessage({ message: new TextEncoder().encode(message), wallet, options: { uiOptions: { showWalletUIs: false } } });
    return sigToString(signature);
  }, [wallet, confirm, signMessage]);
  const pay = useCallback(async (to: string, lamports: number, o: Omit<ConfirmOptions, "kind">, reference?: string) => {
    if (!wallet || !address) throw new Error("Your Shine Wallet is still loading.");
    const { bytes, networkFee, lastValidBlockHeight } = await buildTransfer(address, to, lamports, null, reference);
    await preflight(bytes, { from: address, to, spend: lamports, networkFee });
    const rows = [...(o.rows || []), ["Network fee", `~${(networkFee / LAMPORTS).toFixed(6)} SOL`] as [string, string]];
    if (!(await confirm({ ...o, rows, kind: "transaction" }))) throw new UserRejectedError();
    return signSend(bytes, lastValidBlockHeight);
  }, [wallet, address, confirm, signSend]);
  return { sign, pay, address };
}
