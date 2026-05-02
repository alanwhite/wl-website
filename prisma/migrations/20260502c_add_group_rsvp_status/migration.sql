-- Add RSVP status to Group
ALTER TABLE "Group" ADD COLUMN "rsvpStatus" TEXT NOT NULL DEFAULT 'pending';
