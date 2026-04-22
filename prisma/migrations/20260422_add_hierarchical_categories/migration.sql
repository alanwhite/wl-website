ALTER TABLE "LibraryCategory" ADD COLUMN "parentId" TEXT;
ALTER TABLE "LibraryCategory" ADD CONSTRAINT "LibraryCategory_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "LibraryCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "LibraryCategory_parentId_idx" ON "LibraryCategory"("parentId");
