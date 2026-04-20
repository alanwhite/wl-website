import { prisma } from "./prisma";
import { canAccessPoll } from "./config";

/**
 * Count pending notifications per feature for a user.
 * Returns a map of href → count (e.g. { "/polls": 2 }).
 */
export async function getNotificationCounts(user: {
  id: string;
  roleSlugs?: string[];
  tierLevel?: number;
}): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};

  // Open polls the user hasn't voted on
  const openPolls = await prisma.poll.findMany({
    where: { closedAt: null },
    select: {
      id: true,
      targetRoleSlugs: true,
      targetMinTierLevel: true,
      votes: {
        where: { userId: user.id },
        select: { id: true },
        take: 1,
      },
    },
  });

  const unvotedPolls = openPolls.filter(
    (poll) => canAccessPoll(user, poll) && poll.votes.length === 0,
  );

  if (unvotedPolls.length > 0) {
    counts["/polls"] = unvotedPolls.length;
  }

  return counts;
}
