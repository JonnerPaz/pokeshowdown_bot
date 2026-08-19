-- AlterTable
ALTER TABLE "User" ADD COLUMN     "telegramId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "User_telegramId_key" ON "User"("telegramId");