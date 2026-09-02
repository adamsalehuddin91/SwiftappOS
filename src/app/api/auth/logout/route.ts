import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/session";

export async function POST() {
  const cookieStore = await cookies();

  // Overwrite with an already-expired cookie carrying the same attributes, then
  // delete. `delete` alone can miss when the browser holds a cookie whose path
  // or security flags differ from the default it assumes.
  cookieStore.set(SESSION_COOKIE, "", sessionCookieOptions(0));
  cookieStore.delete(SESSION_COOKIE);

  return NextResponse.json({ success: true });
}
