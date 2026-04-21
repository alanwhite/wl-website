import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/auth-helpers";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { SubmissionActions } from "@/components/forms/submission-actions";

export const dynamic = "force-dynamic";

export default async function SubmissionDetailPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const session = await auth();
  if (!session?.user || session.user.status !== "APPROVED") redirect("/login");

  const { slug, id } = await params;

  const submission = await prisma.formSubmission.findUnique({
    where: { id },
    include: {
      form: { select: { slug: true, title: true, managerRoleSlugs: true, fields: true } },
    },
  });

  if (!submission || submission.form.slug !== slug) notFound();

  const canManage =
    isAdmin(session.user) ||
    submission.form.managerRoleSlugs.some((s) => session.user.roleSlugs?.includes(s));

  if (!canManage) redirect("/dashboard");

  const data = submission.data as Record<string, unknown>;
  const fields = submission.form.fields as { name: string; label: string }[];

  const statusColor = (status: string) => {
    switch (status) {
      case "pending": return "outline" as const;
      case "approved": return "default" as const;
      case "rejected": return "destructive" as const;
      default: return "secondary" as const;
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <Button asChild variant="outline" size="sm">
          <Link href={`/forms/${slug}/submissions`}>Back to Submissions</Link>
        </Button>
        <Badge variant={statusColor(submission.status)}>{submission.status}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Submission Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p><strong>Name:</strong> {submission.name}</p>
          <p><strong>Email:</strong> {submission.email}</p>
          <p><strong>Submitted:</strong> {format(submission.createdAt, "d MMM yyyy, h:mm a")}</p>

          {Object.keys(data).length > 0 && (
            <div className="mt-4 space-y-2 rounded border p-3">
              {fields.map((field) => {
                const value = data[field.name];
                if (value === undefined || value === "") return null;
                return (
                  <p key={field.name}>
                    <strong>{field.label}:</strong> {String(value)}
                  </p>
                );
              })}
              {/* Show any data not in the field definitions */}
              {Object.entries(data).map(([key, value]) => {
                if (fields.some((f) => f.name === key)) return null;
                if (value === undefined || value === "") return null;
                return (
                  <p key={key}>
                    <strong className="capitalize">{key.replace(/([A-Z])/g, " $1").trim()}:</strong>{" "}
                    {String(value)}
                  </p>
                );
              })}
            </div>
          )}

          {submission.reviewedAt && (
            <div className="mt-4 rounded border bg-muted/50 p-3 text-sm">
              <p>
                <strong>Reviewed:</strong> {format(submission.reviewedAt, "d MMM yyyy, h:mm a")}
              </p>
              {submission.reviewNotes && (
                <p className="mt-1"><strong>Notes:</strong> {submission.reviewNotes}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <SubmissionActions
        submissionId={submission.id}
        formSlug={slug}
        status={submission.status}
      />
    </div>
  );
}
