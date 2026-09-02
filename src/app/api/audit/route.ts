import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sanitizeForCaller } from "@/lib/agent-guard";
import { z } from "zod";

/**
 * Read the write trail.
 *
 * GET /api/audit?limit=20&actor=agent&entity=invoice
 *
 * Answers "what has the token been doing" without opening a database client.
 * Before/after snapshots pass through the same redaction as everything else, so
 * an agent reading its own history cannot recover a client email that way.
 */

const querySchema = z.object({
  limit: z.coerce
    .number()
    .int()
    .positive()
    .default(20)
    .transform((n) => Math.min(n, 200)),
  actor: z.enum(["agent", "browser"]).optional(),
  entity: z.enum(["project", "milestone", "quotation", "invoice", "receipt"]).optional(),
  entityId: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const params = querySchema.parse({
      limit: url.searchParams.get("limit") ?? 20,
      actor: url.searchParams.get("actor") ?? undefined,
      entity: url.searchParams.get("entity") ?? undefined,
      entityId: url.searchParams.get("entityId") ?? undefined,
    });

    const where = {
      ...(params.actor && { actor: params.actor }),
      ...(params.entity && { entity: params.entity }),
      ...(params.entityId && { entityId: params.entityId }),
    };

    const [entries, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: params.limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return NextResponse.json(
      sanitizeForCaller(request, {
        total,
        returned: entries.length,
        entries: entries.map((e) => ({
          id: e.id,
          at: e.createdAt.toISOString(),
          actor: e.actor,
          action: e.action,
          entity: e.entity,
          entityId: e.entityId,
          source: e.source,
          before: e.before,
          after: e.after,
        })),
      })
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to read audit log" },
      { status: 500 }
    );
  }
}
