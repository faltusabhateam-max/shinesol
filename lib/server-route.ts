import "server-only";
import { NextResponse } from "next/server";
import { HttpError } from "./server-admin";
export const json = (d: any, status = 200) => NextResponse.json(d, { status, headers: { "cache-control": "no-store" } });
export function fail(e: any) {
  if (e instanceof HttpError) return json({ error: e.message }, e.status);
  console.error("api error", e?.message);
  return json({ error: "Something went wrong. Please try again." }, 500);
}
