import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/**
 * Replay guard for machine callers.
 *
 * The Hermes agent retries a POST when the network times out, but the first
 * attempt may already have committed. Without a replay guard one payment can
 * produce two receipts — and because receipts are what the cashflow figure
 * sums, the money on the dashboard would be wrong, not just the paperwork.
 *
 * Contract:
 *   - Same key + same body  -> the stored response is replayed verbatim.
 *   - Same key + a different body -> 422. The caller reused a key by mistake;
 *     silently returning the old answer would hide a real second payment.
 *   - Same key, first call still running -> 409. The caller should back off,
 *     not race its own earlier attempt.
 *
 * Browser callers send no key and are unaffected.
 */

const HEADER = "x-idempotency-key";

async function hashBody(payload: unknown): Promise<string> {
  const json = JSON.stringify(payload ?? null);
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(json));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function idempotencyKeyFrom(request: Request): string | null {
  const key = request.headers.get(HEADER)?.trim();
  if (!key) return null;
  // Bound the key so a caller cannot write arbitrarily large primary keys.
  return key.slice(0, 200);
}

export type Handler = () => Promise<{ status: number; body: unknown }>;

/**
 * Run `handler` at most once per (key, endpoint). Returns a NextResponse.
 * With no key, the handler simply runs — no row is written.
 */
export async function withIdempotency(
  key: string | null,
  endpoint: string,
  payload: unknown,
  handler: Handler
): Promise<NextResponse> {
  if (!key) {
    const { status, body } = await handler();
    return NextResponse.json(body, { status });
  }

  const requestHash = await hashBody(payload);

  // Claim the key. The unique primary key is what makes this safe under
  // concurrency: exactly one caller wins the insert.
  try {
    await prisma.idempotencyKey.create({ data: { key, endpoint, requestHash } });
  } catch {
    const existing = await prisma.idempotencyKey.findUnique({ where: { key } });

    if (!existing) {
      // Claim vanished between the failed insert and this read (expiry sweep).
      // Treat it as contention rather than pretending the write succeeded.
      return NextResponse.json(
        { error: "Idempotency key is being retried concurrently. Retry shortly." },
        { status: 409 }
      );
    }

    if (existing.endpoint !== endpoint || existing.requestHash !== requestHash) {
      return NextResponse.json(
        {
          error:
            "This Idempotency-Key was already used for a different request. Use a fresh key.",
        },
        { status: 422 }
      );
    }

    if (existing.completedAt && existing.responseStatus !== null) {
      return NextResponse.json(existing.responseBody, {
        status: existing.responseStatus,
        headers: { "x-idempotent-replay": "true" },
      });
    }

    return NextResponse.json(
      { error: "An identical request is still in progress. Retry shortly." },
      { status: 409 }
    );
  }

  try {
    const { status, body } = await handler();

    await prisma.idempotencyKey.update({
      where: { key },
      data: {
        responseStatus: status,
        responseBody: body as never,
        completedAt: new Date(),
      },
    });

    return NextResponse.json(body, { status });
  } catch (error) {
    // Release the claim so a genuine retry is not locked out by a crash.
    await prisma.idempotencyKey.delete({ where: { key } }).catch(() => {});
    throw error;
  }
}
