import "server-only";
import { getDocData } from "./server-admin";
export async function isVerified(uid: string) {
  const f = (await getDocData("shine_meta/flags")) || {};
  const until = f.verifiedUntil?.[uid];
  return (f.verified || []).includes(uid) || (until && new Date(until).getTime() > Date.now());
}
