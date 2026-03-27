/*
  Warnings:

  - You are about to drop the column `sow_details` on the `projects` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "business_settings" ADD COLUMN     "brn" TEXT,
ADD COLUMN     "sstNumber" TEXT;

-- AlterTable
ALTER TABLE "projects" DROP COLUMN "sow_details",
ADD COLUMN     "client_brn" TEXT,
ADD COLUMN     "sowDetails" TEXT;
