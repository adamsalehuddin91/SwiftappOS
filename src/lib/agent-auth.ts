/**
 * Machine-caller authentication for the Hermes agent.
 *
 * Runs inside middleware (Edge runtime), so this file may only use Web Crypto —
 * no `node:crypto`, no Prisma.
 *
 * The agent authenticates with `Authorization: Bearer <AGENT_API_TOKEN>` instead
 * of the browser session cookie, and is confined to the routes listed below.
 * Anything not on the list is refused, so a leaked token cannot delete an
 * invoice, rewrite company settings, or upload a logo.
 */

const encoder = new TextEncoder();

async function sha256(value: string): Promise<Uint8Array> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return new Uint8Array(digest);
}

/** Compare two equal-length byte arrays without leaking position via timing. */
function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

/**
 * Compare secrets by digest, so the loop always runs over 32 bytes and the
 * length of the presented token tells an attacker nothing.
 */
export async function secretsMatch(presented: string, expected: string): Promise<boolean> {
  const [a, b] = await Promise.all([sha256(presented), sha256(expected)]);
  return timingSafeEqual(a, b);
}

/** The browser session cookie value for a given password (unchanged derivation). */
export async function sessionTokenFor(password: string): Promise<string> {
  const digest = await sha256(`${password}-swiftapp-session`);
  return Array.from(digest)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export const MIN_AGENT_TOKEN_LENGTH = 32;

const UUID = "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}";

/**
 * Everything the agent may do. Deliberately excludes:
 *   - every DELETE (invoices, quotations, projects, milestones, costs)
 *   - /api/settings/* (company details, bank account, logo upload)
 *   - /api/auth/*
 *   - PUT edits to quotation/invoice bodies — the agent moves things through
 *     the workflow, it does not rewrite the numbers on a document.
 */
const AGENT_ROUTES: ReadonlyArray<{ method: string; pattern: RegExp }> = [
  { method: "GET", pattern: new RegExp(`^/api/dashboard$`) },
  { method: "GET", pattern: new RegExp(`^/api/analytics$`) },
  { method: "GET", pattern: new RegExp(`^/api/billing/stats$`) },

  { method: "GET", pattern: new RegExp(`^/api/projects$`) },
  { method: "POST", pattern: new RegExp(`^/api/projects$`) },
  { method: "GET", pattern: new RegExp(`^/api/projects/${UUID}$`) },
  { method: "PUT", pattern: new RegExp(`^/api/projects/${UUID}$`) },
  { method: "POST", pattern: new RegExp(`^/api/projects/${UUID}/complete$`) },

  { method: "GET", pattern: new RegExp(`^/api/milestones/due$`) },
  { method: "POST", pattern: new RegExp(`^/api/milestones$`) },
  { method: "PUT", pattern: new RegExp(`^/api/milestones/${UUID}$`) },

  { method: "GET", pattern: new RegExp(`^/api/quotations$`) },
  { method: "GET", pattern: new RegExp(`^/api/quotations/${UUID}$`) },
  { method: "PATCH", pattern: new RegExp(`^/api/quotations/${UUID}$`) },
  { method: "POST", pattern: new RegExp(`^/api/quotations/${UUID}/convert$`) },

  { method: "GET", pattern: new RegExp(`^/api/invoices$`) },
  { method: "POST", pattern: new RegExp(`^/api/invoices$`) },
  { method: "GET", pattern: new RegExp(`^/api/invoices/${UUID}$`) },
  { method: "PATCH", pattern: new RegExp(`^/api/invoices/${UUID}$`) },
  { method: "GET", pattern: new RegExp(`^/api/invoices/${UUID}/receipts$`) },
  { method: "POST", pattern: new RegExp(`^/api/invoices/${UUID}/receipts$`) },
];

export function isAgentRouteAllowed(method: string, pathname: string): boolean {
  return AGENT_ROUTES.some(
    (route) => route.method === method.toUpperCase() && route.pattern.test(pathname)
  );
}
