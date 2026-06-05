-- Projects: permission-bearing containers that group polls, document folders,
-- calendar events, announcements and public forms around an ongoing initiative.
-- Access is layered: a user must pass the project's read gate AND the artifact's
-- own targeting. Artifact links are optional and survive project deletion (SET NULL).
CREATE TYPE "ProjectStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "status" "ProjectStatus" NOT NULL DEFAULT 'ACTIVE',
    "targetRoleSlugs" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "targetMinTierLevel" INTEGER,
    "contributorRoleSlugs" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "contributorMinTierLevel" INTEGER,
    "pinToNav" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Project_slug_key" ON "Project"("slug");
CREATE INDEX "Project_status_pinToNav_idx" ON "Project"("status", "pinToNav");

ALTER TABLE "Project" ADD CONSTRAINT "Project_createdBy_fkey"
  FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Optional project link on each artifact type
ALTER TABLE "Poll" ADD COLUMN "projectId" TEXT;
ALTER TABLE "Poll" ADD CONSTRAINT "Poll_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "Poll_projectId_idx" ON "Poll"("projectId");

ALTER TABLE "LibraryCategory" ADD COLUMN "projectId" TEXT;
ALTER TABLE "LibraryCategory" ADD CONSTRAINT "LibraryCategory_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "LibraryCategory_projectId_idx" ON "LibraryCategory"("projectId");

ALTER TABLE "CalendarEvent" ADD COLUMN "projectId" TEXT;
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "CalendarEvent_projectId_idx" ON "CalendarEvent"("projectId");

ALTER TABLE "Announcement" ADD COLUMN "projectId" TEXT;
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "Announcement_projectId_idx" ON "Announcement"("projectId");

ALTER TABLE "PublicForm" ADD COLUMN "projectId" TEXT;
ALTER TABLE "PublicForm" ADD CONSTRAINT "PublicForm_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "PublicForm_projectId_idx" ON "PublicForm"("projectId");
