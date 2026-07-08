-- Anonymised leaver records. No personal data (no name/email/contact) — just
-- tier and join/leave dates — so it is not personal data under GDPR and has no
-- ongoing retention liability. Written just before a member's User row is
-- hard-deleted (the hard delete remains the actual erasure).
CREATE TABLE "MembershipEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'left',
    "tierName" TEXT NOT NULL,
    "tierLevel" INTEGER NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL,
    "leftAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MembershipEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MembershipEvent_leftAt_idx" ON "MembershipEvent"("leftAt");
