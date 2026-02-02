-- AlterTable
ALTER TABLE "AcademicYear" ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false;
