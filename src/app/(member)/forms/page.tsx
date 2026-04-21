import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/auth-helpers";
import { getFormCreatorRoles, canCreateForms } from "@/lib/config";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, ExternalLink } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function FormsPage() {
  const session = await auth();
  if (!session?.user || session.user.status !== "APPROVED") redirect("/login");

  const admin = isAdmin(session.user);
  const creatorRoles = await getFormCreatorRoles();
  const canCreate = canCreateForms(session.user, creatorRoles);

  const forms = await prisma.publicForm.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { submissions: true } } },
  });

  // Filter: admins see all, others see forms they manage
  const visible = admin
    ? forms
    : forms.filter((f) =>
        f.managerRoleSlugs.some((slug) => session.user.roleSlugs?.includes(slug)),
      );

  if (visible.length === 0 && !admin) redirect("/dashboard");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Forms</h1>
        {canCreate && (
          <Button asChild size="sm">
            <Link href="/forms/manage/create">
              <Plus className="mr-1 h-4 w-4" />
              New Form
            </Link>
          </Button>
        )}
      </div>

      {visible.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No forms yet
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {visible.map((form) => {
            const pendingCount = form._count.submissions;
            return (
              <Card key={form.id}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{form.title}</h3>
                        {!form.published && <Badge variant="outline">Draft</Badge>}
                        {form.closedAt && <Badge variant="secondary">Closed</Badge>}
                        {form.published && !form.closedAt && <Badge variant="default">Live</Badge>}
                      </div>
                      {form.description && (
                        <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{form.description}</p>
                      )}
                      <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{pendingCount} submission{pendingCount !== 1 ? "s" : ""}</span>
                        {form.published && !form.closedAt && (
                          <a
                            href={`/forms/${form.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 hover:text-foreground"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Public link
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/forms/${form.slug}/submissions`}>Submissions</Link>
                      </Button>
                      {canCreate && (
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/forms/manage/${form.id}/edit`}>Edit</Link>
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
