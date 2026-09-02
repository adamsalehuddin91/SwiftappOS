import { NextResponse } from "next/server";

/**
 * Route-side controls for the machine caller.
 *
 * The middleware decides *whether* the agent may reach a route. This file
 * decides what it may do once it is there, and what it may see on the way out.
 */

/**
 * True when the middleware authenticated this request with the agent token.
 *
 * The header is set by the middleware after the token check, overwriting
 * anything the caller sent. A browser request can still arrive carrying the
 * header by hand, but every use of it below only ever *removes* capability or
 * data, so lying about being the agent buys nothing.
 */
export function isAgentCaller(request: Request): boolean {
  return request.headers.get("x-swiftapp-caller") === "agent";
}

export function callerLabel(request: Request): "agent" | "browser" {
  return isAgentCaller(request) ? "agent" : "browser";
}

/** Free-text context the agent may attach to a write, recorded in the audit log. */
export function callerSource(request: Request): string | null {
  const source = request.headers.get("x-agent-source")?.trim();
  return source ? source.slice(0, 200) : null;
}

/**
 * Refuse an agent write that touches fields beyond `allowed`.
 *
 * PUT routes take a whole record, so the agent could rewrite a milestone's
 * amount — turning RM1,000 into RM100 — while nominally "updating a status".
 * Reading a client's email address is the smaller problem.
 *
 * Returns a response to send, or null to continue.
 */
export function rejectDisallowedFields(
  request: Request,
  body: unknown,
  allowed: readonly string[]
): NextResponse | null {
  if (!isAgentCaller(request)) return null;
  if (typeof body !== "object" || body === null) return null;

  const offending = Object.keys(body as Record<string, unknown>).filter(
    (key) => !allowed.includes(key)
  );

  if (offending.length === 0) return null;

  return NextResponse.json(
    {
      error: `Agent may only set: ${allowed.join(", ")}. Rejected: ${offending.join(", ")}.`,
      hint: "Edit the rest in the browser.",
    },
    { status: 403 }
  );
}

/**
 * Fields never returned to the agent.
 *
 * Its five flows need names, amounts and dates. They never need a way to
 * contact a client or the text of a scope of work, so a leaked token cannot
 * become a contact list. Widen this only when a real flow needs it — opening a
 * field later is easy, noticing it leaked is not.
 */
const REDACTED_KEYS = new Set([
  "client_email",
  "clientEmail",
  "client_phone",
  "clientPhone",
  "client_brn",
  "clientBrn",
  "sow_details",
  "sowDetails",
  "notes",
  "description",
]);

/**
 * Only `{}` literals get rebuilt. Recursing into anything else destroys it:
 * a Prisma Decimal and a Date are both `typeof "object"`, and copying their
 * internals into a fresh object drops the `toJSON` that makes them serialise as
 * "1000.00" and an ISO string. A Decimal came back as {s,e,d} and every amount
 * downstream became NaN — silently, because nothing throws on NaN.
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object") return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function stripKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripKeys);

  if (isPlainObject(value)) {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      if (REDACTED_KEYS.has(key)) continue;
      out[key] = stripKeys(val);
    }
    return out;
  }

  return value;
}

/**
 * Strip contact details and free text from a response bound for the agent.
 *
 * Applied to the payload rather than to each mapper, so nested shapes (a project
 * with its milestones, an invoice with its project) are covered by the same
 * pass — and so a route added later is covered the moment it uses this.
 */
export function sanitizeForCaller<T>(request: Request, payload: T): T | unknown {
  return isAgentCaller(request) ? stripKeys(payload) : payload;
}
