/*
  Warnings:

  - A unique constraint covering the columns `[email]` on the table `School` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "School" ADD COLUMN     "email" TEXT,
ADD COLUMN     "logo" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "School_email_key" ON "School"("email");
