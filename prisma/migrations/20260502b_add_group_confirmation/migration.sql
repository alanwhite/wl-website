-- Add confirmation tracking to Group
ALTER TABLE "Group" ADD COLUMN "confirmedAt" TIMESTAMP(3);
ALTER TABLE "Group" ADD COLUMN "confirmedBy" TEXT;

-- Add optional userId link to GroupMember (for system users)
ALTER TABLE "GroupMember" ADD COLUMN "userId" TEXT;
