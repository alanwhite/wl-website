import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/auth-helpers";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

export default async function SubmissionsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const session = await auth();
  if (!session?.user || session.user.status !== "APPROVED") redirect("/login");

  const { slug } = await params;
  const form = await prisma.publicForm.findUnique({
    where: { slug },
    include: {
      submissions: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!form) notFound();

  const canManage =
    isAdmin(session.user) ||
    form.managerRoleSlugs.some((s) => session.user.roleSlugs?.includes(s));

  if (!canManage) redirect("/dashboard");

  const statusColor = (status: string) => {
    switch (status) {
      case "pending": return "outline" as const;
      case "approved": return "default" as const;
      case "rejected": return "destructive" as const;
      default: return "secondary" as const;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{form.title}</h1>
          <p className="text-sm text-muted-foreground">{form.submissions.length} submissions</p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/forms">Back to Forms</Link>
        </Button>
      </div>

      {form.submissions.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No submissions yet
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {form.submissions.map((sub) => (
            <Link key={sub.id} href={`/forms/${slug}/submissions/${sub.id}`} className="block">
              <Card className="transition-colors hover:bg-muted/50">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{sub.name}</p>
                      <p className="text-sm text-muted-foreground truncate">{sub.email}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {format(sub.createdAt, "d MMM yyyy, h:mm a")}
                      </p>
                    </div>
                    <Badge variant={statusColor(sub.status)}>{sub.status}</Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
