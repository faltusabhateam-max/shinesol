import { SiteFooter } from "@/components/site-footer";
export default function InfoLayout({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-4xl">{children}<SiteFooter /></div>;
}
