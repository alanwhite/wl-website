-- Fix PollVote user cascade delete
ALTER TABLE "PollVote" DROP CONSTRAINT IF EXISTS "PollVote_userId_fkey";
ALTER TABLE "PollVote" ADD CONSTRAINT "PollVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
