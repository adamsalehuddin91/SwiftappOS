/*
  Warnings:

  - You are about to drop the column `sowDetails` on the `projects` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "projects" DROP COLUMN "sowDetails",
ADD COLUMN     "sow_details" TEXT;
