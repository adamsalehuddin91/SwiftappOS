import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { secretsMatch } from "@/lib/crypto-edge";
import { SESSION_COOKIE, issueSession, sessionCookieOptions } from "@/lib/session";
import {
  MAX_FAILURES,
  WINDOW_MINUTES,
  checkLoginRateLimit,
  clearFailures,
  clientBucket,
  failureDelay,
  recordFailure,
} from "@/lib/login-rate-limit";

export async function POST(request: NextRequest) {
  try {
    const expected = process.env.SWIFTAPP_PASSWORD;

    if (!expected) {
      return NextResponse.json({ error: "Auth not configured" }, { status: 500 });
    }

    const bucket = await clientBucket(request);

    // Checked before the password is even read. A lock that still accepts a
    // correct guess slows no attacker down — they walk through it the moment
    // they land on the right value.
    const limit = await checkLoginRateLimit(bucket);
    if (!limit.allowed) {
      return NextResponse.json(
        {
          error: `Too many failed attempts. Try again in ${Math.ceil(
            limit.retryAfterSeconds / 60
          )} minute(s).`,
        },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
      );
    }

    const body = await request.json().catch(() => null);
    const password = typeof body?.password === "string" ? body.password : null;

    // Compare by digest rather than `password !== expected`. String equality
    // returns as soon as two characters differ, which leaks how much of a guess
    // was right; hashing first makes every comparison take the same 32 bytes.
    if (!password || !(await secretsMatch(password, expected))) {
      await recordFailure(bucket);
      await failureDelay();

      const remaining = Math.max(0, MAX_FAILURES - (limit.failures + 1));
      return NextResponse.json(
        {
          error: "Invalid password",
          attemptsRemaining: remaining,
          windowMinutes: WINDOW_MINUTES,
        },
        { status: 401 }
      );
    }

    // A correct password clears the bucket, so a run of typos costs nothing
    // once the real password lands.
    await clearFailures(bucket);

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
