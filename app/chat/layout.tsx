import type { ReactNode } from "react";
import { ChatLock } from "@/components/pin";
export default function ChatLayout({ children }: { children: ReactNode }) {
  return <ChatLock>{children}</ChatLock>;
}
