-- Optional image attached to an announcement, so updates can be posted with
-- a photo in the same way as a Facebook-style post.
ALTER TABLE "Announcement" ADD COLUMN "imageUrl" TEXT;
