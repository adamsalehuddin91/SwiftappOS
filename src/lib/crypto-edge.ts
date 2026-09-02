/**
 * Crypto primitives shared by the middleware and the auth routes.
 *
 * The middleware runs on the Edge runtime, so everything here is Web Crypto —
 * no `node:crypto`, no Buffer.
 */

const encoder = new TextEncoder();

export async function sha256(value: string): Promise<Uint8Array> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return new Uint8Array(digest);
}

/** Compare two byte arrays without leaking the first differing index via timing. */
export function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

/**
 * Compare two secrets by digest. Hashing first means the comparison always runs
 * over 32 bytes, so neither the length of the presented value nor the position
 * of the first wrong character is observable.
 */
export async function secretsMatch(presented: string, expected: string): Promise<boolean> {
  const [a, b] = await Promise.all([sha256(presented), sha256(expected)]);
  return timingSafeEqual(a, b);
}

// ── base64url ────────────────────────────────────────────────────────────
// atob/btoa exist on Edge; Buffer does not.

export function base64UrlEncode(value: string): string {
  return btoa(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function base64UrlDecode(value: string): string | null {
  try {
    const padded = value.replace(/-/g, "+").replace(/_/g, "/");
    return atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
  } catch {
    return null;
  }
}

export function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return base64UrlEncode(binary);
}

export function base64UrlToBytes(value: string): Uint8Array | null {
  const binary = base64UrlDecode(value);
  if (binary === null) return null;
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
