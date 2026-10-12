"use client";
import { use, useEffect, useState } from "react";
import { SessionGate } from "@/components/gate";
import { useSession } from "@/components/providers";
import { PostEditor } from "@/components/post-editor";
import { BackLink, Empty, FullLoader, PageTitle } from "@/components/ui";
import { getPost } from "@/lib/db";
import type { Post } from "@/lib/types";

function Inner({ id }: { id: string }) {
  const { profile, uid } = useSession();
  const [post, setPost] = useState<Post | null | undefined>(undefined);
  useEffect(() => { getPost(id).then(setPost).catch(() => setPost(null)); }, [id]);
  if (post === undefined) return <FullLoader />;
  if (!post || post.authorUid !== uid || !profile) return <Empty title="Post unavailable" text="This post doesn't exist or you don't have permission to edit it." />;
  return <PostEditor author={profile} post={post} />;
}
export default function EditPost({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <div>
      <BackLink href="/events" label="Events" />
      <PageTitle>Edit post</PageTitle>
      <SessionGate><Inner id={id} /></SessionGate>
    </div>
  );
}
