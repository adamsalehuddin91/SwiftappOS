-- Agent API support: project completion, per-invoice milestone billing links,
-- and an idempotency store for machine callers.

-- AddEnumValue: projects can now reach a terminal Completed state after Live.
-- Safe inside Prisma's migration transaction on PG12+ because the new label is
-- only added here, never read back in the same transaction.
ALTER TYPE "ProjectStatus" ADD VALUE IF NOT EXISTS 'Completed';

-- AlterTable: completion timestamp + frozen handover checklist snapshot
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "completed_at" TIMESTAMPTZ;
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "delivery_checklist" JSONB;

-- AlterTable: record WHICH invoice billed each milestone.
-- Without this, recording payment on one invoice marked every Invoiced
-- milestone on the project as Paid, including milestones billed on other
-- invoices that were still unpaid.
ALTER TABLE "milestones" ADD COLUMN IF NOT EXISTS "invoiced_by_invoice_id" UUID;

ALTER TABLE "milestones" DROP CONSTRAINT IF EXISTS "milestones_invoiced_by_invoice_id_fkey";
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_invoiced_by_invoice_id_fkey"
  FOREIGN KEY ("invoiced_by_invoice_id") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "milestones_invoiced_by_invoice_id_idx"
  ON "milestones"("invoiced_by_invoice_id");

-- Backfill: existing invoices carry at most one milestone link (invoices.milestone_id).
-- Multi-milestone invoices raised before this migration have no recoverable link;
-- those milestones stay NULL and must be settled by hand — the payment route
-- reports how many it skipped rather than guessing.
UPDATE "milestones" m
   SET "invoiced_by_invoice_id" = i."id"
  FROM "invoices" i
 WHERE i."milestone_id" = m."id"
   AND m."invoiced_by_invoice_id" IS NULL;

-- CreateTable: replay guard for retried machine writes
CREATE TABLE IF NOT EXISTS "idempotency_keys" (
    "key" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "request_hash" TEXT NOT NULL,
    "response_status" INTEGER,
    "response_body" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ,

    CONSTRAINT "idempotency_keys_pkey" PRIMARY KEY ("key")
);

CREATE INDEX IF NOT EXISTS "idempotency_keys_created_at_idx" ON "idempotency_keys"("created_at");
