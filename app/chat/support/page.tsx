"use client";
import { SessionGate } from "@/components/gate";
import { useSession } from "@/components/providers";
import { SupportConversation } from "@/components/support-thread";

function Inner() {
  const { uid, profile } = useSession();
  return <SupportConversation threadUid={uid!} mode="user" profile={profile} backHref="/chat" />;
}
export default function SupportPage() {
  return <SessionGate allowDeactivated text="Sign in to chat with Shine Support."><Inner /></SessionGate>;
}
