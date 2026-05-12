-- Allow CMS pages to opt out of the site header and/or footer chrome,
-- for hero-led landing pages where global chrome competes with the design.
ALTER TABLE "Page" ADD COLUMN "hideHeader" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Page" ADD COLUMN "hideFooter" BOOLEAN NOT NULL DEFAULT false;
