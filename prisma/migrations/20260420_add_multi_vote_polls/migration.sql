-- AlterTable: add maxVotes to Poll
ALTER TABLE "Poll" ADD COLUMN "maxVotes" INTEGER NOT NULL DEFAULT 1;

-- Drop old unique constraint (single vote per user per poll)
ALTER TABLE "PollVote" DROP CONSTRAINT IF EXISTS "PollVote_pollId_userId_key";

-- Create new unique constraint (one vote per user per option)
CREATE UNIQUE INDEX "PollVote_pollId_userId_optionId_key" ON "PollVote"("pollId", "userId", "optionId");
