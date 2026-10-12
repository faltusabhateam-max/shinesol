"use client";
import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore, getFirestore, type Firestore } from "firebase/firestore";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
};

let app: FirebaseApp;
let db: Firestore;
export function fb() {
  if (!app) {
    app = getApps()[0] ?? initializeApp(config);
    try {
      db = initializeFirestore(app, { ignoreUndefinedProperties: true });
    } catch {
      db = getFirestore(app);
    }
  }
  return { app, db, auth: getAuth(app) };
}
