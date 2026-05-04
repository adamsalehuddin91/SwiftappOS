-- AlterTable: make invoices.project_id nullable to allow standalone invoices
ALTER TABLE "invoices" ALTER COLUMN "project_id" DROP NOT NULL;

-- Drop old FK constraint (Cascade) and re-add with SET NULL
ALTER TABLE "invoices" DROP CONSTRAINT IF EXISTS "invoices_project_id_fkey";
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_project_id_fkey"
  FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
