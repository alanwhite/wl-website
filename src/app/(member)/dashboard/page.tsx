import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSiteInfo, getGroupMemberFields, getGroupLabel, getGroupConfirmLabel, getGroupManagerRoles, canManageGroups } from "@/lib/config";
import { AnnouncementsPanel } from "@/components/shared/announcements-panel";
import { PasskeyPrompt } from "@/components/auth/passkey-prompt";
import { prisma } from "@/lib/prisma";
import { GroupHub } from "@/components/groups/group-hub";
import { AdminGroupSummary } from "@/components/groups/admin-group-summary";

export const dynamic = "force-dynamic";

const passkeysEnabled = process.env.AUTH_CREDENTIALS_TEST !== "true";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [siteInfo, memberFields, groupLabel, confirmLabel, managerRoles] = await Promise.all([
    getSiteInfo(),
    getGroupMemberFields(),
    getGroupLabel(),
    getGroupConfirmLabel(),
    getGroupManagerRoles(),
  ]);

  const isManager = canManageGroups(session.user, managerRoles);
  const hasGroupFeature = memberFields.length > 0;

  // Check if we should show the passkey setup prompt
  let showPasskeyPrompt = false;
  if (passkeysEnabled) {
    const [passkeyCount, profile] = await Promise.all([
      prisma.authenticator.count({ where: { userId: session.user.id } }),
      prisma.userProfile.findUnique({
        where: { userId: session.user.id },
        select: { extra: true },
      }),
    ]);
    const extra = (profile?.extra as Record<string, unknown>) ?? {};
    showPasskeyPrompt = passkeyCount === 0 && !extra.passkeyPromptDismissed;
  }

  // Group hub: fetch user's group with members
  let userGroup = null;
  if (hasGroupFeature) {
    const userWithGroup = await prisma.user.findUnique({
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
    const g = userWithGroup?.groups[0];
    if (g) {
      userGroup = {
        id: g.id,
        name: g.name,
        description: g.description,
        confirmedAt: g.confirmedAt?.toISOString() ?? null,
        groupMembers: g.groupMembers.map((m) => ({
          id: m.id,
          name: m.name,
          userId: m.userId,
          data: (m.data as Record<string, string>) ?? {},
        })),
      };
    }
  }

  // Admin summary: fetch all groups
  let allGroups = null;
  if (hasGroupFeature && isManager) {
    const groups = await prisma.group.findMany({
      orderBy: { name: "asc" },
      include: {
        groupMembers: {
          select: { id: true, name: true, data: true },
        },
      },
    });
    allGroups = groups.map((g) => ({
      id: g.id,
      name: g.name,
      description: g.description,
      confirmedAt: g.confirmedAt?.toISOString() ?? null,
      groupMembers: g.groupMembers.map((m) => ({
        id: m.id,
        name: m.name,
        data: (m.data as Record<string, string>) ?? {},
      })),
    }));
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          {hasGroupFeature ? `Welcome, ${session.user.name ?? "Guest"}` : "Dashboard"}
        </h1>
        {!hasGroupFeature && (
          <p className="text-muted-foreground">
            Welcome back, {session.user.name ?? "Member"}!
          </p>
        )}
      </div>

      {showPasskeyPrompt && <PasskeyPrompt />}

      {/* Admin/manager summary */}
      {allGroups && (
        <AdminGroupSummary
          groups={allGroups}
          groupLabel={groupLabel}
          memberFields={memberFields}
        />
      )}

      {/* Guest group hub */}
      {hasGroupFeature && userGroup && !isManager && (
        <GroupHub
          group={userGroup}
          groupLabel={groupLabel}
          confirmLabel={confirmLabel}
          memberFields={memberFields}
          currentUserId={session.user.id}
        />
      )}

      {/* No group assigned yet */}
      {hasGroupFeature && !userGroup && !isManager && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              You haven&apos;t been assigned to a {groupLabel.toLowerCase()} yet. Please check back soon.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Standard dashboard content (when no group feature) */}
      {!hasGroupFeature && (
        <>
          <AnnouncementsPanel />
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Welcome to {siteInfo.name}</CardTitle>
                <CardDescription>You are an approved member</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  You have access to all member resources. Use the navigation menu to explore.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Your Profile</CardTitle>
                <CardDescription>Manage your account information</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Keep your profile up to date. Visit the{" "}
                  <a href="/profile" className="text-primary underline">
                    profile page
                  </a>{" "}
                  to make changes.
                </p>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
