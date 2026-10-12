import { redirect } from "next/navigation";
/** The multi-step form was retired in favour of Shine's one-tap apply sheet on the post page. */
export default async function ApplyRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/p/${encodeURIComponent(id)}?apply=1`);
}
