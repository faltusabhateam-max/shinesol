"use client";
import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { fb } from "./firebase";
import { C } from "./config";
import type { EscrowPlan } from "./escrow";

/** All escrow plans where the user is the project or the creator. */
export function useMyEscrow(uid: string | null) {
  const [a, setA] = useState<EscrowPlan[] | null>(null);
  const [b, setB] = useState<EscrowPlan[] | null>(null);
  useEffect(() => {
    if (!uid) return;
    const { db } = fb();
    const map = (s: any) => s.docs.map((d: any) => ({ id: d.id, ...d.data() }) as EscrowPlan);
    const u1 = onSnapshot(query(collection(db, C.escrow), where("projectUid", "==", uid)), (s) => setA(map(s)), () => setA([]));
    const u2 = onSnapshot(query(collection(db, C.escrow), where("creatorUid", "==", uid)), (s) => setB(map(s)), () => setB([]));
    return () => { u1(); u2(); };
  }, [uid]);
  if (a === null || b === null) return null;
  return [...a, ...b].sort((x, y) => (y.updatedAt?.toMillis?.() || 0) - (x.updatedAt?.toMillis?.() || 0));
}
