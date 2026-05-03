import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getGroupLabel, getGroupMemberFields, getGroupConfirmLabel } from "@/lib/config";
import { Card, CardContent } from "@/components/ui/card";
import { GroupHub } from "@/components/groups/group-hub";

export const dynamic = "force-dynamic";

export default async function MyGroupPage() {
  const session = await auth();
  if (!session?.user || session.user.status !== "APPROVED") redirect("/login");

  const [groupLabel, memberFields, confirmLabel] = await Promise.all([
    getGroupLabel(),
    getGroupMemberFields(),
    getGroupConfirmLabel(),
  ]);

  const userWithGroups = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      groups: {
        take: 1,
        include: {
          groupMembers: {
            orderBy: { createdAt: "asc" },
            select: { id: true, name: true, userId: true, data: true },
          },
        },
      },
    },
  });

  const g = userWithGroups?.groups[0];

  if (!g) {
    return (
      <div className="mx-auto max-w-2xl">
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

  const group = {
    id: g.id,
    name: g.name,
    description: g.description,
    rsvpStatus: g.rsvpStatus,
    groupMembers: g.groupMembers.map((m) => ({
      id: m.id,
      name: m.name,
      userId: m.userId,
      data: (m.data as Record<string, string>) ?? {},
    })),
  };

  return (
    <div className="mx-auto max-w-2xl">
      <GroupHub
        group={group}
        groupLabel={groupLabel}
        confirmLabel={confirmLabel}
        memberFields={memberFields}
        currentUserId={session.user.id}
      />
    </div>
  );
}
