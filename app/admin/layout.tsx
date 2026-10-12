import type { Metadata } from "next";
import { AdminLayoutClient } from "@/components/admin";
export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}
