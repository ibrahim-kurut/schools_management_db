/*
  Warnings:

  - You are about to drop the column `totalScore` on the `Grade` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[studentId,subjectId,academicYearId,examType]` on the table `Grade` will be added. If there are existing duplicate values, this will fail.
  - Changed the type of `examType` on the `Grade` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "ExamType" AS ENUM ('OCTOBER', 'NOVEMBER', 'DECEMBER', 'FIRST_SEMESTER_AVG', 'MIDYEAR', 'MARCH', 'APRIL', 'SECOND_SEMESTER_AVG', 'ANNUAL_EFFORT', 'FINAL_EXAM', 'FINAL_GRADE', 'SECOND_ROUND_EXAM', 'LAST_GRADE');

-- AlterTable
ALTER TABLE "Grade" DROP COLUMN "totalScore",
ADD COLUMN     "isCalculated" BOOLEAN NOT NULL DEFAULT false,
DROP COLUMN "examType",
ADD COLUMN     "examType" "ExamType" NOT NULL;

-- CreateIndex
CREATE INDEX "Grade_examType_idx" ON "Grade"("examType");

-- CreateIndex
CREATE UNIQUE INDEX "Grade_studentId_subjectId_academicYearId_examType_key" ON "Grade"("studentId", "subjectId", "academicYearId", "examType");
