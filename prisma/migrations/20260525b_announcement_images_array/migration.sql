-- Replace the single imageUrl with an array of imageUrls so posts can carry
-- multiple photos (Facebook-style gallery). Migrates existing single-image
-- announcements by wrapping their imageUrl into a one-element array.
ALTER TABLE "Announcement" ADD COLUMN "imageUrls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
UPDATE "Announcement" SET "imageUrls" = ARRAY["imageUrl"] WHERE "imageUrl" IS NOT NULL;
ALTER TABLE "Announcement" DROP COLUMN "imageUrl";
