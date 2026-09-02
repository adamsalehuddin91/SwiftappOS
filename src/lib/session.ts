/**
 * Browser session tokens.
 *
 * The previous token was `SHA256(password + "-swiftapp-session")` — one fixed
 * string for the life of the password. Every login produced the same value, it
 * never expired, and the only way to revoke it was to change the password. Any
 * copy of the cookie — a shared laptop, a synced browser profile, a screenshot
 * of devtools — was a permanent key.
 *
 * Now each login mints a distinct token that carries its own expiry and is
 * signed with HMAC-SHA256. Edge runtime, so Web Crypto only.
 *
 * Revocation is still by rotating the signing secret: change SWIFTAPP_PASSWORD
 * (or set SESSION_SECRET and change that) and every outstanding session dies.
 * For a single-user app that is the whole revocation story, and it is now a
 * story that exists — before, changing the password was the only lever and
 * nobody would think to pull it over a leaked cookie.
 */

import {
  base64UrlDecode,
  base64UrlEncode,
  base64UrlToBytes,
  bytesToBase64Url,
  sha256,
  timingSafeEqual,
} from "@/lib/crypto-edge";

export const SESSION_COOKIE = "swiftapp-session";

/** Absolute lifetime of a session. */
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

/**
 * Re-issue a session once it is inside this much of its expiry, so an actively
 * used browser is never logged out while an abandoned cookie still dies.
 */
export const SESSION_RENEW_WITHIN_SECONDS = 60 * 60 * 24 * 7; // 7 days

const VERSION = "v2";

interface SessionPayload {
  v: number;
  iat: number;
  exp: number;
  /** Per-login randomness, so two logins never mint the same token. */
  n: string;
}

/**
 * Derive the HMAC key from the configured secret. SESSION_SECRET wins when set,
 * so sessions can be invalidated without changing the password Adam types.
 */
async function signingKey(password: string): Promise<CryptoKey> {
  const secret = process.env.SESSION_SECRET || password;
  const material = await sha256(`${secret}|swiftapp-session-key|${VERSION}`);
  return crypto.subtle.importKey(
    "raw",
    material as unknown as ArrayBuffer,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
}

async function sign(data: string, password: string): Promise<Uint8Array> {
  const key = await signingKey(password);
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(data)
  );
  return new Uint8Array(signature);
}

function randomNonce(): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export interface IssuedSession {
  token: string;
  /** Seconds until expiry — feed straight to the cookie's maxAge. */
  maxAge: number;
}

export async function issueSession(password: string): Promise<IssuedSession> {
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = {
    v: 2,
    iat: now,
    exp: now + SESSION_TTL_SECONDS,
    n: randomNonce(),
  };

  const encoded = base64UrlEncode(JSON.stringify(payload));
  const body = `${VERSION}.${encoded}`;
  const signature = await sign(body, password);

  return {
    token: `${body}.${bytesToBase64Url(signature)}`,
    maxAge: SESSION_TTL_SECONDS,
  };
}

export interface VerifiedSession {
  valid: boolean;
  /** Seconds left before expiry; only meaningful when valid. */
  secondsRemaining: number;
}

const INVALID: VerifiedSession = { valid: false, secondsRemaining: 0 };

export async function verifySession(
  token: string | undefined,
  password: string
): Promise<VerifiedSession> {
  if (!token) return INVALID;

  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== VERSION) return INVALID;

  const [, encodedPayload, encodedSignature] = parts;

  const presented = base64UrlToBytes(encodedSignature);
  if (!presented) return INVALID;

  // Verify the signature before parsing the payload: an unsigned payload is
  // attacker-controlled input and must not steer any logic, not even a parse.
  const expected = await sign(`${VERSION}.${encodedPayload}`, password);
  if (!timingSafeEqual(presented, expected)) return INVALID;

  const json = base64UrlDecode(encodedPayload);
  if (!json) return INVALID;

  let payload: SessionPayload;
  try {
    payload = JSON.parse(json) as SessionPayload;
  } catch {
    return INVALID;
  }

  if (payload.v !== 2 || typeof payload.exp !== "number") return INVALID;

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp <= now) return INVALID;

  return { valid: true, secondsRemaining: payload.exp - now };
}

/** Cookie attributes, kept in one place so login, logout and renewal agree. */
export function sessionCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge,
    path: "/",
  };
}
