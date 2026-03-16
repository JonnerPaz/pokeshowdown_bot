/*
  Warnings:

  - The `types` column on the `Pokemon` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "Pokemon" ADD COLUMN     "timesCaught" INTEGER NOT NULL DEFAULT 1,
DROP COLUMN "types",
ADD COLUMN     "types" TEXT[];

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(6);

-- DropEnum
DROP TYPE "PokemonType";
