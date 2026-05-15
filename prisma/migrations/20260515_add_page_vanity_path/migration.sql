-- Optional short top-level URL alias for a CMS page (e.g. /gala mapping to /p/gala-day-2026).
-- Unique so different pages can't claim the same path; nullable so most pages don't have one.
ALTER TABLE "Page" ADD COLUMN "vanityPath" TEXT;
CREATE UNIQUE INDEX "Page_vanityPath_key" ON "Page"("vanityPath");
