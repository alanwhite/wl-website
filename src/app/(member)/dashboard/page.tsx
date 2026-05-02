import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getSiteInfo,
  getGroupMemberFields,
  getGroupLabel,
  getGroupConfirmLabel,
  getGroupManagerRoles,
  canManageGroups,
  getDashboardCards,
} from "@/lib/config";
import type { DashboardCard } from "@/lib/config";
import { AnnouncementsPanel } from "@/components/shared/announcements-panel";
import { PasskeyPrompt } from "@/components/auth/passkey-prompt";
import { prisma } from "@/lib/prisma";
import { GroupHub } from "@/components/groups/group-hub";
import { AdminGroupSummary } from "@/components/groups/admin-group-summary";
import Markdown from "react-markdown";

export const dynamic = "force-dynamic";

const passkeysEnabled = process.env.AUTH_CREDENTIALS_TEST !== "true";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [siteInfo, memberFields, groupLabel, confirmLabel, managerRoles, dashboardCards] = await Promise.all([
    getSiteInfo(),
    getGroupMemberFields(),
    getGroupLabel(),
    getGroupConfirmLabel(),
    getGroupManagerRoles(),
    getDashboardCards(),
  ]);

  const isManager = canManageGroups(session.user, managerRoles);
  const hasGroupFeature = memberFields.length > 0;
  const hasCustomDashboard = dashboardCards.length > 0;

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

  // Fetch user's group for group-hub cards
  let userGroup = null;
  if (hasGroupFeature || hasCustomDashboard) {
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
        rsvpStatus: g.rsvpStatus,
        groupMembers: g.groupMembers.map((m) => ({
          id: m.id,
          name: m.name,
          userId: m.userId,
          data: (m.data as Record<string, string>) ?? {},
        })),
      };
    }
  }

  // Fetch all groups for admin summary
  let allGroups = null;
  if ((hasGroupFeature || hasCustomDashboard) && isManager) {
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
      rsvpStatus: g.rsvpStatus,
      groupMembers: g.groupMembers.map((m) => ({
        id: m.id,
        name: m.name,
        data: (m.data as Record<string, string>) ?? {},
      })),
    }));
  }

  // Fetch page content for page cards
  const pageSlugs = dashboardCards
    .filter((c): c is DashboardCard & { slug: string } => c.type === "page" && !!c.slug)
    .map((c) => c.slug);

  const pages = pageSlugs.length > 0
    ? await prisma.page.findMany({
        where: { slug: { in: pageSlugs }, published: true },
        select: { slug: true, title: true, content: true },
      })
    : [];

  const pageMap = new Map(pages.map((p) => [p.slug, p]));

  // Custom dashboard with configurable cards
  if (hasCustomDashboard) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        {showPasskeyPrompt && <PasskeyPrompt />}

        {dashboardCards.map((card, idx) => {
          if (card.type === "page" && card.slug) {
            const page = pageMap.get(card.slug);
            if (!page) return null;
            return (
              <Card key={idx}>
                {(card.title || page.title) && (
                  <CardHeader>
                    <CardTitle>{card.title || page.title}</CardTitle>
                  </CardHeader>
                )}
                <CardContent>
                  <div className="prose prose-sm dark:prose-invert max-w-none prose-img:rounded-lg">
                    <Markdown>{page.content}</Markdown>
                  </div>
                </CardContent>
              </Card>
            );
          }

          if (card.type === "admin-summary" && isManager && allGroups) {
            return (
              <AdminGroupSummary
                key={idx}
                groups={allGroups}
                groupLabel={groupLabel}
                memberFields={memberFields}
              />
            );
          }

          if (card.type === "group-hub") {
            if (isManager && allGroups) {
              return (
                <AdminGroupSummary
                  key={idx}
                  groups={allGroups}
                  groupLabel={groupLabel}
                  memberFields={memberFields}
                />
              );
            }
            if (userGroup) {
              return (
                <GroupHub
                  key={idx}
                  group={userGroup}
                  groupLabel={groupLabel}
                  confirmLabel={confirmLabel}
                  memberFields={memberFields}
                  currentUserId={session.user.id}
                />
              );
            }
            return (
              <Card key={idx}>
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground">
                    You haven&apos;t been assigned to a {groupLabel.toLowerCase()} yet.
                  </p>
                </CardContent>
              </Card>
            );
          }

          return null;
        })}
      </div>
    );
  }

  // Standard dashboard (no custom cards configured)
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
