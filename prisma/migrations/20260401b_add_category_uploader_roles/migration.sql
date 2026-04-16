-- AlterTable
ALTER TABLE "LibraryCategory" ADD COLUMN "uploaderRoleSlugs" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "LibraryCategory" ADD COLUMN "uploaderMinTierLevel" INTEGER;
