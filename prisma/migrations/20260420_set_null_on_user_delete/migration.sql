-- Make createdBy/uploadedBy nullable and set to NULL on user deletion
-- Content (documents, events, transactions, polls) survives user deletion

-- Poll: createdBy nullable + SetNull
ALTER TABLE "Poll" ALTER COLUMN "createdBy" DROP NOT NULL;
ALTER TABLE "Poll" DROP CONSTRAINT IF EXISTS "Poll_createdBy_fkey";
ALTER TABLE "Poll" ADD CONSTRAINT "Poll_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- LibraryDocument: uploadedBy nullable + SetNull
ALTER TABLE "LibraryDocument" ALTER COLUMN "uploadedBy" DROP NOT NULL;
ALTER TABLE "LibraryDocument" DROP CONSTRAINT IF EXISTS "LibraryDocument_uploadedBy_fkey";
ALTER TABLE "LibraryDocument" ADD CONSTRAINT "LibraryDocument_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CalendarEvent: createdBy nullable + SetNull
ALTER TABLE "CalendarEvent" ALTER COLUMN "createdBy" DROP NOT NULL;
ALTER TABLE "CalendarEvent" DROP CONSTRAINT IF EXISTS "CalendarEvent_createdBy_fkey";
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Transaction: createdBy nullable + SetNull
ALTER TABLE "Transaction" ALTER COLUMN "createdBy" DROP NOT NULL;
ALTER TABLE "Transaction" DROP CONSTRAINT IF EXISTS "Transaction_createdBy_fkey";
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
