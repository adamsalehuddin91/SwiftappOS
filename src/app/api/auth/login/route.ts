import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { secretsMatch } from "@/lib/crypto-edge";
import { SESSION_COOKIE, issueSession, sessionCookieOptions } from "@/lib/session";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const password = typeof body?.password === "string" ? body.password : null;
    const expected = process.env.SWIFTAPP_PASSWORD;

    if (!expected) {
      return NextResponse.json({ error: "Auth not configured" }, { status: 500 });
    }

    // Compare by digest rather than `password !== expected`. String equality
    // returns as soon as two characters differ, which leaks how much of a guess
    // was right; hashing first makes every comparison take the same 32 bytes.
    if (!password || !(await secretsMatch(password, expected))) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }

    // Each login mints its own token: random nonce, own expiry, HMAC signature.
    // The old token was SHA256(password + "-swiftapp-session") — the same value
    // for every login, with no expiry and no way to revoke a stolen copy.
    const session = await issueSession(expected);

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE, session.token, sessionCookieOptions(session.maxAge));

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
