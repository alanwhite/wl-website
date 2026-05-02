import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getGroupLabel } from "@/lib/config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GroupMemberList } from "@/components/groups/group-member-list";

export const dynamic = "force-dynamic";

export default async function MyGroupPage() {
  const session = await auth();
  if (!session?.user || session.user.status !== "APPROVED") redirect("/login");

  const groupLabel = await getGroupLabel();

  const userWithGroups = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      groups: {
        include: {
          members: { select: { id: true, name: true, email: true } },
          groupMembers: {
            orderBy: { createdAt: "asc" },
            select: { id: true, name: true, data: true },
          },
        },
      },
    },
  });

  const groups = userWithGroups?.groups ?? [];

  if (groups.length === 0) {
    return (
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-6 text-2xl font-bold">My {groupLabel}</h1>
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              You haven&apos;t been assigned to a {groupLabel.toLowerCase()} yet.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">My {groupLabel}</h1>
      {groups.map((group) => (
        <Card key={group.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{group.name}</CardTitle>
              <Badge variant="secondary">
                {group.members.length + group.groupMembers.length} members
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {group.members.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-medium">Registered Users</h3>
                <div className="space-y-1">
                  {group.members.map((m) => (
                    <div key={m.id} className="text-sm text-muted-foreground">
                      {m.name || m.email}
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div>
              <h3 className="mb-2 text-sm font-medium">Additional Members</h3>
              <GroupMemberList
                groupId={group.id}
                members={group.groupMembers}
                groupLabel={groupLabel}
              />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
