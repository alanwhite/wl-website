import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { RegistrationActions } from "@/components/admin/registration-actions";

export const dynamic = "force-dynamic";

export default async function RegistrationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const registration = await prisma.registration.findUnique({
    where: { id },
    include: {
      user: true,
      documents: true,
    },
  });

  if (!registration) notFound();

  // Fetch non-system tiers for the approval selector (exclude Pending and Admin)
  const tiers = await prisma.membershipTier.findMany({
    where: { isSystem: false },
    orderBy: { level: "asc" },
    select: { id: true, name: true, level: true },
  });

  const customFields = registration.customFields as Record<string, unknown>;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Registration Review</h1>
        <Badge
          variant={
            registration.user.status === "PENDING_REVIEW"
              ? "outline"
              : registration.user.status === "APPROVED"
                ? "default"
                : "destructive"
          }
        >
          {registration.user.status}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>User Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p><strong>Name:</strong> {registration.user.name ?? "—"}</p>
          <p><strong>Email:</strong> {registration.user.email ?? "—"}</p>
          <p><strong>Submitted:</strong> {format(registration.createdAt, "PPP")}</p>
          {registration.termsAcceptedAt && (
            <p><strong>Terms Accepted:</strong> {format(registration.termsAcceptedAt, "PPP 'at' p")}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Registration Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {Object.entries(customFields).map(([key, value]) => (
            <p key={key}>
              <strong className="capitalize">{key.replace(/([A-Z])/g, " $1").trim()}:</strong>{" "}
              {String(value)}
            </p>
          ))}
          {Object.keys(customFields).length === 0 && (
            <p className="text-muted-foreground">No custom fields submitted</p>
          )}
        </CardContent>
      </Card>

      {registration.documents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Documents</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {registration.documents.map((doc) => (
                <li key={doc.id} className="flex items-center justify-between rounded border p-3">
                  <div>
                    <p className="font-medium">{doc.fileName}</p>
                    <p className="text-xs text-muted-foreground">
                      {doc.fileType} &middot; {(doc.fileSize / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {registration.user.status === "PENDING_REVIEW" && (
        <RegistrationActions registrationId={registration.id} tiers={tiers} />
      )}
    </div>
  );
}
