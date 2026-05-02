import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getGroupManagerRoles, canManageGroups, getGroupLabel } from "@/lib/config";
import { GroupManager } from "@/components/groups/group-manager";

export const dynamic = "force-dynamic";

export default async function AdminGroupsPage() {
  const session = await auth();
  if (!session?.user || session.user.status !== "APPROVED") redirect("/login");

  const managerRoles = await getGroupManagerRoles();
  if (!canManageGroups(session.user, managerRoles)) redirect("/dashboard");

  const [groups, groupLabel, approvedUsers] = await Promise.all([
    prisma.group.findMany({
      orderBy: { name: "asc" },
      include: {
        members: { select: { id: true, name: true, email: true } },
        groupMembers: { select: { id: true, name: true } },
      },
    }),
    getGroupLabel(),
    prisma.user.findMany({
      where: { status: "APPROVED" },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true },
    }),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">Manage {groupLabel}s</h1>
      <GroupManager groups={groups} groupLabel={groupLabel} allUsers={approvedUsers} />
    </div>
  );
}
