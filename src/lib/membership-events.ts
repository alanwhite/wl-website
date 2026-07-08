import { prisma } from "./prisma";

/**
 * Record an anonymised leaver event for a user about to be hard-deleted.
 * Stores NO personal data (no name/email/contact) — only tier and the
 * join/leave dates — so it is not personal data under GDPR. Call this
 * immediately before prisma.user.delete. Never throws: a stats side-record
 * must not block the actual removal.
 */
export async function recordLeaver(user: {
  tierName: string;
  tierLevel: number;
  createdAt: Date;
}): Promise<void> {
  try {
    await prisma.membershipEvent.create({
      data: {
        type: "left",
        tierName: user.tierName,
        tierLevel: user.tierLevel,
        joinedAt: user.createdAt,
      },
    });
  } catch (err) {
    console.error("[membership-events] Failed to record leaver:", err);
  }
}
