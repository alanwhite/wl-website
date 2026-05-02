import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getMemberManagerRoles, canManageMembers } from "@/lib/config";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { MemberActions } from "@/components/members/member-actions";

export const dynamic = "force-dynamic";

export default async function MemberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user || session.user.status !== "APPROVED") redirect("/login");

  const managerRoles = await getMemberManagerRoles();
  if (!canManageMembers(session.user, managerRoles)) redirect("/dashboard");

  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      tier: { select: { id: true, name: true, level: true } },
      userRoles: { include: { role: { select: { id: true, name: true, slug: true } } } },
      registration: true,
    },
  });

  if (!user) notFound();

  // Pending users should be managed via the registrations page, not here
  if (user.status === "PENDING_REVIEW") {
    const reg = await prisma.registration.findUnique({ where: { userId: user.id }, select: { id: true } });
    if (reg) redirect(`/members/registrations/${reg.id}`);
    notFound();
  }

  const [tiers, roles] = await Promise.all([
    prisma.membershipTier.findMany({
      where: { isSystem: false },
      orderBy: { level: "asc" },
      select: { id: true, name: true, level: true },
    }),
    prisma.role.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true, minTierLevel: true },
    }),
  ]);

  const customFields = (user.registration?.customFields as Record<string, unknown>) ?? {};

  // Don't allow managing other admins (only admins can manage admins)
  const isTargetAdmin = user.tierLevel >= 999;
  const isCurrentAdmin = (session.user.tierLevel ?? 0) >= 999;
  const canEdit = !isTargetAdmin || isCurrentAdmin;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Member Details</h1>
        <Button asChild variant="outline" size="sm">
          <Link href="/members">Back to Members</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p><strong>Name:</strong> {user.name ?? "—"}</p>
          <p><strong>Email:</strong> {user.email ?? "—"}</p>
          <p>
            <strong>Status:</strong>{" "}
            <Badge
              variant={
                user.status === "APPROVED" ? "default" :
                user.status === "SUSPENDED" ? "destructive" : "outline"
              }
            >
              {user.status}
            </Badge>
          </p>
          <p><strong>Tier:</strong> {user.tier.name} (level {user.tier.level})</p>
          {user.userRoles.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <strong>Roles:</strong>
              {user.userRoles.map((ur) => (
                <Badge key={ur.roleId} variant="outline">{ur.role.name}</Badge>
              ))}
            </div>
          )}
          <p><strong>Joined:</strong> {format(user.createdAt, "PPP")}</p>
        </CardContent>
      </Card>

      {Object.keys(customFields).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Registration Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(customFields).map(([key, value]) => {
              let addressObj: { postcode?: string; line1?: string; line2?: string; town?: string } | null = null;
              if (typeof value === "string") {
                try {
                  const parsed = JSON.parse(value);
                  if (parsed && typeof parsed === "object" && parsed.postcode) addressObj = parsed;
                } catch { /* not JSON */ }
              }

              if (addressObj) {
                return (
                  <div key={key} className="space-y-1">
                    <strong className="capitalize">{key.replace(/([A-Z])/g, " $1").trim()}:</strong>
                    <div className="ml-4 text-sm">
                      {addressObj.line1 && <p>{addressObj.line1}</p>}
                      {addressObj.line2 && <p>{addressObj.line2}</p>}
                      {addressObj.town && <p>{addressObj.town}</p>}
                      {addressObj.postcode && <p className="font-medium">{addressObj.postcode}</p>}
                    </div>
                  </div>
                );
              }

              return (
                <p key={key}>
                  <strong className="capitalize">{key.replace(/([A-Z])/g, " $1").trim()}:</strong>{" "}
                  {String(value)}
                </p>
              );
            })}
          </CardContent>
        </Card>
      )}

      {canEdit && (
        <MemberActions
          userId={user.id}
          currentTierId={user.tier.id}
          currentStatus={user.status}
          currentRoleIds={user.userRoles.map((ur) => ur.role.id)}
          tiers={tiers}
          roles={roles}
          userName={user.name ?? user.email ?? "this user"}
        />
      )}

      {!canEdit && (
        <Card>
          <CardContent className="py-4 text-center text-sm text-muted-foreground">
            This user is an administrator. Only other administrators can modify admin accounts.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
