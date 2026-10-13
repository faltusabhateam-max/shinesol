"use client";
import { PrivyProvider, usePrivy, useLogin, useLogout } from "@privy-io/react-auth";
import { useWallets } from "@privy-io/react-auth/solana";
import { createSolanaRpc, createSolanaRpcSubscriptions } from "@solana/kit";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, type User as FbUser } from "firebase/auth";
import { doc, onSnapshot, updateDoc, serverTimestamp } from "firebase/firestore";
import { fb } from "@/lib/firebase";
import { C, PRIVY_APP_ID, SITE_URL } from "@/lib/config";
import type { ShineUser } from "@/lib/types";
import { ToastProvider } from "./toast";
import { ConfirmProvider } from "./confirm";
import { FlagsProvider } from "./flags";

type Session = {
  ready: boolean;
  authenticated: boolean;
  fbReady: boolean;
  uid: string | null;
  email: string | null;
  profile: ShineUser | null;
  profileLoaded: boolean;
  wallet: any | null; // ConnectedStandardSolanaWallet
  wallets: any[];
  address: string | null;
  setActiveAddress: (a: string) => void;
  login: () => void;
  logout: () => Promise<void>;
  authError: string | null;
};
const Ctx = createContext<Session | null>(null);
export const useSession = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useSession must be used within Providers");
  return c;
};

function SessionBridge({ children }: { children: ReactNode }) {
  const { ready, authenticated, user, getAccessToken } = usePrivy();
  const { login } = useLogin();
  const { logout: privyLogout } = useLogout();
  const { wallets, ready: walletsReady } = useWallets();
  const [fbUser, setFbUser] = useState<FbUser | null>(null);
  const [fbChecked, setFbChecked] = useState(false);
  const [profile, setProfile] = useState<ShineUser | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const linking = useRef(false);

  // Screenshot/demo mode: only active in builds with NEXT_PUBLIC_DEMO_MODE=1 (never set in production).
  const [demo, setDemo] = useState(false);
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_DEMO_MODE !== "1") return;
    try {
      if (new URLSearchParams(window.location.search).has("demo")) sessionStorage.setItem("shine.demo", "1");
      if (sessionStorage.getItem("shine.demo") === "1") setDemo(true);
    } catch {}
  }, []);


  useEffect(() => {
    const { auth } = fb();
    return onAuthStateChanged(auth, (u) => { setFbUser(u); setFbChecked(true); });
  }, []);

  useEffect(() => {
    try { setActive(localStorage.getItem("shine.activeWallet")); } catch {}
  }, []);

  // Bridge Privy -> Firebase
  useEffect(() => {
    if (!ready || !fbChecked || demo) return;
    const { auth } = fb();
    if (!authenticated) {
      if (auth.currentUser) signOut(auth);
      return;
    }
    if (linking.current) return;
    linking.current = true;
    (async () => {
      try {
        const token = await getAccessToken();
        const r = await fetch("/api/auth/firebase", { method: "POST", headers: { authorization: `Bearer ${token}` } });
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || "Sign-in failed.");
        if (auth.currentUser?.email === j.email) return;
        if (auth.currentUser) await signOut(auth);
        try {
          await signInWithEmailAndPassword(auth, j.email, j.password);
        } catch (e: any) {
          const code = e?.code || "";
          if (code.includes("invalid-credential") || code.includes("user-not-found") || code.includes("invalid-login")) {
            try { await createUserWithEmailAndPassword(auth, j.email, j.password); }
            catch (e2: any) {
              if ((e2?.code || "").includes("email-already-in-use")) await signInWithEmailAndPassword(auth, j.email, j.password);
              else throw e2;
            }
          } else throw e;
        }
        setAuthError(null);
      } catch (e: any) {
        setAuthError(e?.message || "We couldn't connect your account. Please try again.");
      } finally {
        linking.current = false;
      }
    })();
  }, [ready, authenticated, fbChecked, getAccessToken, user?.id, demo]);

  const uid = (authenticated || demo) && fbUser ? fbUser.uid : null;

  useEffect(() => {
    if (!uid) { setProfile(null); setProfileLoaded(!authenticated ? true : false); return; }
    setProfileLoaded(false);
    const { db } = fb();
    return onSnapshot(doc(db, C.users, uid), (s) => {
      setProfile(s.exists() ? ({ uid, ...(s.data() as any) } as ShineUser) : null);
      setProfileLoaded(true);
    }, () => setProfileLoaded(true));
  }, [uid, authenticated]);

  const solWallets = useMemo(() => (walletsReady ? wallets : []), [wallets, walletsReady]);
  const wallet = useMemo(() => {
    if (!solWallets.length) return null;
    return solWallets.find((w: any) => w.address === active) || solWallets[0];
  }, [solWallets, active]);
  const address: string | null = wallet?.address ?? null;

  // Keep the payout address on the profile in sync with the active wallet.
  useEffect(() => {
    if (!uid || !profile || !address || profile.wallet === address) return;
    const { db } = fb();
    updateDoc(doc(db, C.users, uid), { wallet: address, updatedAt: serverTimestamp() }).catch(() => {});
  }, [uid, profile, address]);

  const setActiveAddress = useCallback((a: string) => {
    setActive(a);
    try { localStorage.setItem("shine.activeWallet", a); } catch {}
  }, []);

  const logout = useCallback(async () => {
    await privyLogout();
    await signOut(fb().auth).catch(() => {});
  }, [privyLogout]);

  useEffect(() => {
    if (!demo) return;
    const e = process.env.NEXT_PUBLIC_DEMO_FB_EMAIL, p = process.env.NEXT_PUBLIC_DEMO_FB_PASSWORD;
    if (e && p && !fb().auth.currentUser) signInWithEmailAndPassword(fb().auth, e, p).catch(() => {});
  }, [demo]);

  const value: Session = {
    ready,
    authenticated,
    fbReady: !!uid,
    uid,
    email: user?.email?.address ?? null,
    profile,
    profileLoaded,
    wallet,
    wallets: solWallets,
    address,
    setActiveAddress,
    login: () => login(),
    logout,
    authError,
  };
  if (demo) {
    const DEMO = "86xCnPeV69n6t3DnyGvkKobf9FdN2H9oiVDdaMpo2MMY";
    const duid = fbUser?.uid || "demo";
    Object.assign(value, {
      ready: true, authenticated: true, fbReady: true, uid: duid, email: "demo@shine.app", profileLoaded: true, authError: null, address: DEMO, wallet: { address: DEMO }, wallets: [{ address: DEMO }],
      profile: { uid: duid, username: "ShineDemo", usernameLower: "shinedemo", xHandle: "ShineDemo", telegram: "shinedemo", discord: "", avatar: "5", bio: "", wallet: DEMO, role: "user", project: null },
    });
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export default function Providers({ children }: { children: ReactNode }) {
  const solana = useMemo(() => {
    if (typeof window === "undefined") return undefined;
    const rpcUrl = `${window.location.origin}/api/rpc`;
    const ws = process.env.NEXT_PUBLIC_SOLANA_WS_URL || "wss://solana-rpc.publicnode.com";
    return { rpcs: { "solana:mainnet": { rpc: createSolanaRpc(rpcUrl), rpcSubscriptions: createSolanaRpcSubscriptions(ws), blockExplorerUrl: "https://solscan.io" } } };
  }, []);
  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        loginMethods: ["email"],
        appearance: {
          theme: "dark",
          accentColor: "#ff5e8a",
          logo: `${SITE_URL}/brand/star-192.png`,
          landingHeader: "Welcome to Shine",
          loginMessage: "Sign in or create your account with email.",
          walletChainType: "solana-only",
          showWalletLoginFirst: false,
        },
        embeddedWallets: {
          showWalletUIs: false,
          ethereum: { createOnLogin: "off" },
          solana: { createOnLogin: "all-users" },
        },
        solana: solana as any,
      }}
    >
      <ToastProvider>
        <ConfirmProvider>
          <FlagsProvider>
            <SessionBridge>{children}</SessionBridge>
          </FlagsProvider>
        </ConfirmProvider>
      </ToastProvider>
    </PrivyProvider>
  );
}
