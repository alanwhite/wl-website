-- CreateTable
CREATE TABLE "LibraryCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "targetRoleSlugs" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "targetMinTierLevel" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LibraryCategory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LibraryCategory_slug_key" ON "LibraryCategory"("slug");

-- CreateTable
CREATE TABLE "LibraryDocument" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LibraryDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LibraryDocument_categoryId_idx" ON "LibraryDocument"("categoryId");

-- CreateIndex
CREATE INDEX "LibraryDocument_createdAt_idx" ON "LibraryDocument"("createdAt");

-- AddForeignKey
ALTER TABLE "LibraryDocument" ADD CONSTRAINT "LibraryDocument_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "LibraryCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LibraryDocument" ADD CONSTRAINT "LibraryDocument_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
