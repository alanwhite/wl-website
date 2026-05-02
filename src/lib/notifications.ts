import { prisma } from "./prisma";
import { canAccessPoll, getMemberManagerRoles, canManageMembers } from "./config";

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

  // Pending form submissions for forms the user manages
  const isAdmin = (user.tierLevel ?? 0) >= 999;
  if (isAdmin || (user.roleSlugs && user.roleSlugs.length > 0)) {
    const forms = await prisma.publicForm.findMany({
      where: isAdmin
        ? undefined
        : { managerRoleSlugs: { hasSome: user.roleSlugs ?? [] } },
      select: {
        _count: { select: { submissions: { where: { status: "pending" } } } },
      },
    });

    const pendingSubmissions = forms.reduce((sum, f) => sum + f._count.submissions, 0);
    if (pendingSubmissions > 0) {
      counts["/forms"] = pendingSubmissions;
    }
  }

  // Pending registrations for member managers
  const memberManagerRoles = await getMemberManagerRoles();
  if (canManageMembers(user, memberManagerRoles)) {
    const pendingRegistrations = await prisma.user.count({
      where: { status: "PENDING_REVIEW" },
    });
    if (pendingRegistrations > 0) {
      counts["/members/registrations"] = pendingRegistrations;
    }
  }

  return counts;
}
