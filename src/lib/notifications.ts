import { prisma } from "./prisma";
import { canAccessPoll, getMemberManagerRoles, canManageMembers, getGroupMemberFields } from "./config";
import type { RegistrationField } from "./config";

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

  // RSVP / group member field completion for /groups
  const memberFields = await getGroupMemberFields();
  if (memberFields.length > 0) {
    const userWithGroup = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        groups: {
          take: 1,
          select: {
            rsvpStatus: true,
            groupMembers: { select: { data: true } },
          },
        },
      },
    });

    const group = userWithGroup?.groups[0];
    if (group) {
      if (group.rsvpStatus === "pending") {
        counts["/groups"] = 1; // needs RSVP
      } else if (group.rsvpStatus === "attending") {
        const requiredFields = memberFields.filter((f: RegistrationField) => f.required);
        if (requiredFields.length > 0) {
          const incomplete = group.groupMembers.filter((m) => {
            const data = (m.data as Record<string, string>) ?? {};
            return !requiredFields.every((f: RegistrationField) => data[f.name] && data[f.name] !== "");
          }).length;
          if (incomplete > 0) {
            counts["/groups"] = incomplete;
          }
        }
      }
    }
  }

  return counts;
}
