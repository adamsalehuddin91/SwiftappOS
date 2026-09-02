-- Attribution for quotations, matching projects, invoices and receipts.
ALTER TABLE "quotations" ADD COLUMN IF NOT EXISTS "created_by" TEXT;
