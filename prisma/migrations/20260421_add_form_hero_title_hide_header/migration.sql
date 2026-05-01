-- Merged into 20260421_add_public_forms for fresh deployments
-- This is a no-op if the columns were already added by the CREATE TABLE
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'PublicForm')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'PublicForm' AND column_name = 'heroTitle') THEN
    ALTER TABLE "PublicForm" ADD COLUMN "heroTitle" TEXT;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'PublicForm')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'PublicForm' AND column_name = 'hideHeader') THEN
    ALTER TABLE "PublicForm" ADD COLUMN "hideHeader" BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;
