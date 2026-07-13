/*
  Warnings:

  - You are about to drop the column `positionId` on the `VoteRecord` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[electionId,studentId]` on the table `VoteRecord` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "VoteRecord" DROP CONSTRAINT "VoteRecord_positionId_fkey";

-- DropIndex
DROP INDEX "VoteRecord_studentId_electionId_positionId_key";

-- AlterTable
ALTER TABLE "VoteRecord" DROP COLUMN "positionId";

-- CreateIndex
CREATE UNIQUE INDEX "VoteRecord_electionId_studentId_key" ON "VoteRecord"("electionId", "studentId");
