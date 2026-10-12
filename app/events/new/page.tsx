"use client";
import { SessionGate } from "@/components/gate";
import { useSession } from "@/components/providers";
import { PostEditor } from "@/components/post-editor";
import { BackLink, Empty, PageTitle } from "@/components/ui";

function Inner() {
  const { profile } = useSession();
  if (profile?.role !== "project" && process.env.NEXT_PUBLIC_DEMO_MODE !== "1") return <Empty title="Projects only" text="Switch your account to a Project from your profile to publish posts." />;
  return <PostEditor author={profile!} />;
}
export default function NewPost() {
  return (
    <div>
      <BackLink href="/events" label="Events" />
      <PageTitle sub="Publish an opportunity. Add apply steps, or keep one-tap apply.">New post</PageTitle>
      <SessionGate><Inner /></SessionGate>
    </div>
  );
}
