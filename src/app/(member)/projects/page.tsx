import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  canAccessProject,
  canManageProjects,
  getProjectManagerRoles,
  getProjectLabel,
} from "@/lib/config";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FolderKanban, ChevronRight, Plus } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const session = await auth();
  if (!session?.user || session.user.status !== "APPROVED") redirect("/login");

  const [managerRoles, label] = await Promise.all([
    getProjectManagerRoles(),
    getProjectLabel(),
  ]);
  const isManager = canManageProjects(session.user, managerRoles);

  const projects = await prisma.project.findMany({
    orderBy: [{ status: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
    include: {
      _count: {
        select: { polls: true, categories: true, events: true, announcements: true, forms: true },
      },
    },
  });

  const accessible = isManager
    ? projects
    : projects.filter((p) => canAccessProject(session.user, p));

  const active = accessible.filter((p) => p.status === "ACTIVE");
  const archived = accessible.filter((p) => p.status === "ARCHIVED");

  function projectCard(p: (typeof accessible)[number]) {
    const itemCount =
      p._count.polls + p._count.categories + p._count.events + p._count.announcements + p._count.forms;
    return (
      <Link key={p.id} href={`/projects/${p.slug}`} className="block">
        <Card className="transition-colors hover:bg-muted/50">
          <CardContent className="py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <FolderKanban className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <h3 className="font-semibold">{p.name}</h3>
                  {p.status === "ARCHIVED" && (
                    <Badge variant="secondary" className="text-xs">Archived</Badge>
                  )}
                </div>
                {p.description && (
                  <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{p.description}</p>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  {itemCount} item{itemCount === 1 ? "" : "s"}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 self-center text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </Link>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{label}s</h1>
        {isManager && (
          <Button asChild size="sm">
            <Link href="/admin/projects/new">
              <Plus className="mr-1 h-4 w-4" />
              New {label}
            </Link>
          </Button>
        )}
      </div>

      {accessible.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No {label.toLowerCase()}s yet
          </CardContent>
        </Card>
      )}

      {active.length > 0 && <div className="space-y-3">{active.map(projectCard)}</div>}

      {archived.length > 0 && (
        <>
          {active.length > 0 && <hr className="my-6" />}
          <h2 className="mb-3 text-lg font-semibold text-muted-foreground">Archived</h2>
          <div className="space-y-3">{archived.map(projectCard)}</div>
        </>
      )}
    </div>
  );
}
