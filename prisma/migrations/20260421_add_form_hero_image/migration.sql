-- Merged into 20260421_add_public_forms for fresh deployments
-- This is a no-op if the column was already added by the CREATE TABLE
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'PublicForm')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'PublicForm' AND column_name = 'heroImageUrl') THEN
    ALTER TABLE "PublicForm" ADD COLUMN "heroImageUrl" TEXT;
  END IF;
END $$;
