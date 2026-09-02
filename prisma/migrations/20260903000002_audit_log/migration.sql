-- Audit trail for writes, plus per-record attribution.

ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "created_by" TEXT;
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "created_by" TEXT;
ALTER TABLE "receipts" ADD COLUMN IF NOT EXISTS "created_by" TEXT;

CREATE TABLE IF NOT EXISTS "audit_log" (
    "id" UUID NOT NULL,
    "entity" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "source" TEXT,
    "before" JSONB,
    "after" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "audit_log_entity_entity_id_created_at_idx"
  ON "audit_log"("entity", "entity_id", "created_at");
CREATE INDEX IF NOT EXISTS "audit_log_actor_created_at_idx"
  ON "audit_log"("actor", "created_at");
