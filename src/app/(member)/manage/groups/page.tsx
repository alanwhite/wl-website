import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getGroupManagerRoles, canManageGroups, getGroupLabel, getGroupMemberFields, getGroupsLocked } from "@/lib/config";
import { GroupManager } from "@/components/groups/group-manager";
import { AdminGroupSummary } from "@/components/groups/admin-group-summary";

export const dynamic = "force-dynamic";

export default async function AdminGroupsPage() {
  const session = await auth();
  if (!session?.user || session.user.status !== "APPROVED") redirect("/login");

  const managerRoles = await getGroupManagerRoles();
  if (!canManageGroups(session.user, managerRoles)) redirect("/dashboard");

  const [groups, groupLabel, approvedUsers, memberFields, locked] = await Promise.all([
    prisma.group.findMany({
      orderBy: { name: "asc" },
      include: {
        members: { select: { id: true, name: true, email: true } },
        groupMembers: { select: { id: true, name: true, userId: true, data: true } },
      },
    }),
    getGroupLabel(),
    prisma.user.findMany({
      where: { status: "APPROVED", tierLevel: { lt: 999 } },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true },
    }),
    getGroupMemberFields(),
    getGroupsLocked(),
  ]);

  const summaryGroups = groups.map((g) => ({
    id: g.id,
    name: g.name,
    description: g.description,
    rsvpStatus: g.rsvpStatus,
    groupMembers: g.groupMembers.map((m) => ({
      id: m.id,
      name: m.name,
      data: (m.data as Record<string, string>) ?? {},
    })),
  }));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">Manage {groupLabel}s</h1>
      {memberFields.length > 0 && (
        <AdminGroupSummary
          groups={summaryGroups}
          groupLabel={groupLabel}
          memberFields={memberFields}
          locked={locked}
          exportUrl="/api/export/groups"
        />
      )}
      <GroupManager groups={groups} groupLabel={groupLabel} allUsers={approvedUsers} />
    </div>
  );
}
