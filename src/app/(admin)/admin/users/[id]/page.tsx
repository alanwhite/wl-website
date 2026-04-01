import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      tier: { select: { name: true, level: true } },
      userRoles: { include: { role: { select: { name: true } } } },
      profile: true,
      registration: { include: { documents: true } },
    },
  });

  if (!user) notFound();

  const customFields = (user.registration?.customFields as Record<string, unknown>) ?? {};

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">User Details</h1>
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/users">Back to Users</Link>
        </Button>
      </div>

      {/* Basic Info */}
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
            <div className="flex items-center gap-2">
              <strong>Roles:</strong>
              {user.userRoles.map((ur) => (
                <Badge key={ur.roleId} variant="outline">{ur.role.name}</Badge>
              ))}
            </div>
          )}
          <p><strong>Joined:</strong> {format(user.createdAt, "PPP")}</p>
        </CardContent>
      </Card>

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {user.profile ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {user.profile.phone && <p><strong>Phone:</strong> {user.profile.phone}</p>}
              {user.profile.address && (
                <p>
                  <strong>Address:</strong> {user.profile.address}
                  {user.profile.city && `, ${user.profile.city}`}
                  {user.profile.state && `, ${user.profile.state}`}
                  {user.profile.zip && ` ${user.profile.zip}`}
                </p>
              )}
              {user.profile.bio && (
                <div className="sm:col-span-2">
                  <strong>Bio:</strong>
                  <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">{user.profile.bio}</p>
                </div>
              )}
              {!user.profile.phone && !user.profile.address && !user.profile.bio && (
                <p className="text-muted-foreground sm:col-span-2">Profile exists but no details filled in</p>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground">No profile information</p>
          )}
        </CardContent>
      </Card>

      {/* Registration */}
      <Card>
        <CardHeader>
          <CardTitle>Registration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {user.registration ? (
            <>
              <p><strong>Submitted:</strong> {format(user.registration.createdAt, "PPP")}</p>
              {user.registration.termsAcceptedAt && (
                <p><strong>Terms Accepted:</strong> {format(user.registration.termsAcceptedAt, "PPP 'at' p")}</p>
              )}
              {user.registration.reviewedAt && (
                <p><strong>Reviewed:</strong> {format(user.registration.reviewedAt, "PPP")}</p>
              )}
              {user.registration.reviewNotes && (
                <p><strong>Review Notes:</strong> {user.registration.reviewNotes}</p>
              )}

              {Object.keys(customFields).length > 0 && (
                <div className="mt-4 space-y-2 rounded border p-3">
                  <p className="text-sm font-medium">Registration Fields</p>
                  {Object.entries(customFields).map(([key, value]) => (
                    <p key={key} className="text-sm">
                      <strong className="capitalize">{key.replace(/([A-Z])/g, " $1").trim()}:</strong>{" "}
                      {String(value)}
                    </p>
                  ))}
                </div>
              )}

              {user.registration.documents.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-medium">Documents</p>
                  {user.registration.documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between rounded border p-2">
                      <div>
                        <p className="text-sm font-medium">{doc.fileName}</p>
                        <p className="text-xs text-muted-foreground">
                          {doc.fileType} &middot; {(doc.fileSize / 1024).toFixed(1)} KB
                        </p>
                      </div>
                      <Button variant="outline" size="sm" asChild>
                        <a href={`/uploads/${doc.filePath}`} target="_blank" rel="noopener noreferrer">
                          View
                        </a>
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <p className="text-muted-foreground">No registration submitted</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
