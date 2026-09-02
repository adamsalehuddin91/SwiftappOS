import prisma from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { callerLabel, callerSource } from "@/lib/agent-guard";

/**
 * Write trail for records that carry money or client commitments.
 *
 * Two questions this answers that nothing else can: "where did this invoice
 * come from?" months later, and "what did the token touch?" if one ever leaks.
 *
 * Logging never fails the operation it describes. A write that succeeded must
 * not be reported as failed because its audit row could not be stored — so the
 * helper swallows its own errors. The cost is that a crash landing between the
 * write and the log loses that entry; for a single-operator ledger that is the
 * right trade, and the receipt path avoids it by logging inside the same
 * transaction as the payment.
 */

export type AuditEntity =
  | "project"
  | "milestone"
  | "quotation"
  | "invoice"
  | "receipt";

export type AuditAction =
  | "create"
  | "update"
  | "status"
  | "payment"
  | "complete";

interface AuditInput {
  request: Request;
  entity: AuditEntity;
  entityId: string;
  action: AuditAction;
  before?: unknown;
  after?: unknown;
  /** Pass the transaction client to log atomically with the write it records. */
  tx?: Prisma.TransactionClient;
}

/** Keep snapshots small and free of noise the log does not need. */
function snapshot(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined || value === null) return undefined;
  // Decimal and Date do not survive JSON.stringify usefully on their own;
  // going through the default serialiser gives ISO dates and numeric strings,
  // which is what a human reading the log wants to see.
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export async function recordAudit(input: AuditInput): Promise<void> {
  const { request, entity, entityId, action, before, after, tx } = input;

  const data = {
    entity,
    entityId,
    action,
    actor: callerLabel(request),
    source: callerSource(request),
    before: snapshot(before),
    after: snapshot(after),
  };

  try {
    if (tx) {
      await tx.auditLog.create({ data });
    } else {
      await prisma.auditLog.create({ data });
    }
  } catch {
    // Deliberately swallowed — see the note at the top of this file.
  }
}
