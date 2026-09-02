import prisma from "@/lib/prisma";
import { sha256 } from "@/lib/crypto-edge";

/**
 * Brute-force guard for the password gate.
 *
 * The gate is a single password with no username and no second factor, so the
 * only thing standing between a stranger who finds the URL and the whole
 * ledger is how many guesses per hour they get. Before this, the answer was
 * unlimited.
 *
 * Counters live in Postgres, not in a Map. An in-memory counter resets on every
 * redeploy — and a redeploy is exactly what an attacker's traffic might
 * provoke — and it is not shared if the app is ever scaled past one container
 * (AP-028).
 *
 * The check runs BEFORE the password comparison, deliberately. If a locked-out
 * caller could still have a correct guess accepted, the lock would slow nobody
 * down: an attacker mid-sweep would simply walk through it the moment they hit
 * the right value. The cost is that ten wrong passwords in fifteen minutes locks
 * Adam out for the rest of the window too.
 */

/** Wrong passwords allowed per address per window before the door shuts. */
export const MAX_FAILURES = Number(process.env.LOGIN_MAX_FAILURES ?? 10);

/** Rolling window, in minutes. */
export const WINDOW_MINUTES = Number(process.env.LOGIN_WINDOW_MINUTES ?? 15);

/** Delay added to every rejected attempt, blunting fast automated guessing. */
const FAILURE_DELAY_MS = 300;

const WINDOW_MS = WINDOW_MINUTES * 60 * 1000;

/**
 * Identify the caller.
 *
 * Behind Coolify the app sits behind a reverse proxy, so the socket address is
 * always the proxy and x-forwarded-for carries the real client. That header is
 * forgeable by anyone talking to the app directly, so this is a speed bump for
 * honest traffic and scripted guessing — not an access control. It never
 * decides whether a password is correct, only how often one may be offered.
 *
 * The address is hashed before storage: this table exists to count, not to
 * build a log of who visited.
 */
export async function clientBucket(request: Request): Promise<string> {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip =
    forwarded?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    // No proxy header at all: everyone shares one bucket. Stricter than
    // per-address, which is the right way to fail here.
    "unknown";

  const digest = await sha256(`${ip}|swiftapp-login-bucket`);
  return Array.from(digest)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export interface RateLimitVerdict {
  allowed: boolean;
  failures: number;
  retryAfterSeconds: number;
}

export async function checkLoginRateLimit(bucket: string): Promise<RateLimitVerdict> {
  const since = new Date(Date.now() - WINDOW_MS);

  const attempts = await prisma.loginAttempt.findMany({
    where: { ipHash: bucket, createdAt: { gte: since } },
    orderBy: { createdAt: "asc" },
    select: { createdAt: true },
  });

  if (attempts.length < MAX_FAILURES) {
    return { allowed: true, failures: attempts.length, retryAfterSeconds: 0 };
  }

  // The door reopens when the oldest failure in the window ages out.
  const oldest = attempts[0].createdAt.getTime();
  const retryAfterSeconds = Math.max(1, Math.ceil((oldest + WINDOW_MS - Date.now()) / 1000));

  return { allowed: false, failures: attempts.length, retryAfterSeconds };
}

export async function recordFailure(bucket: string): Promise<void> {
  await prisma.loginAttempt.create({ data: { ipHash: bucket } });

  // Opportunistic sweep so the table cannot grow without bound. Cheap: it only
  // ever runs on a failed login, which should be rare.
  await prisma.loginAttempt
    .deleteMany({ where: { createdAt: { lt: new Date(Date.now() - WINDOW_MS * 4) } } })
    .catch(() => {});
}

export async function clearFailures(bucket: string): Promise<void> {
  await prisma.loginAttempt.deleteMany({ where: { ipHash: bucket } });
}

/** Constant pause on every rejection. */
export function failureDelay(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, FAILURE_DELAY_MS));
}
