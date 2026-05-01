-- Merged into 20260421_add_public_forms
ALTER TABLE "PublicForm" ADD COLUMN IF NOT EXISTS "heroTitle" TEXT;
ALTER TABLE "PublicForm" ADD COLUMN IF NOT EXISTS "hideHeader" BOOLEAN NOT NULL DEFAULT false;
