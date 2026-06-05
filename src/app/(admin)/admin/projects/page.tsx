import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getProjectManagerRoles, canManageProjects, getProjectLabel } from "@/lib/config";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminProjectsPage() {
  const session = await auth();
  if (!session?.user || session.user.status !== "APPROVED") redirect("/login");
  const managerRoles = await getProjectManagerRoles();
  if (!canManageProjects(session.user, managerRoles)) redirect("/dashboard");

  const [projects, label] = await Promise.all([
    prisma.project.findMany({
      orderBy: [{ status: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
      include: {
        _count: {
          select: { polls: true, categories: true, events: true, announcements: true, forms: true },
        },
      },
    }),
    getProjectLabel(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{label}s</h1>
        <Button asChild>
          <Link href="/admin/projects/new">
            <Plus className="mr-2 h-4 w-4" />
            New {label}
          </Link>
        </Button>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Content</TableHead>
              <TableHead>Access</TableHead>
              <TableHead>Nav</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No {label.toLowerCase()}s yet
                </TableCell>
              </TableRow>
            )}
            {projects.map((p) => {
              const itemCount =
                p._count.polls + p._count.categories + p._count.events + p._count.announcements + p._count.forms;
              return (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">
                    {p.name}
                    <span className="ml-2 text-xs text-muted-foreground">/projects/{p.slug}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={p.status === "ACTIVE" ? "default" : "secondary"}>
                      {p.status === "ACTIVE" ? "Active" : "Archived"}
                    </Badge>
                  </TableCell>
                  <TableCell>{itemCount} item{itemCount === 1 ? "" : "s"}</TableCell>
                  <TableCell>
                    {p.targetRoleSlugs.length > 0 || p.targetMinTierLevel != null ? (
                      <Badge variant="outline">Restricted</Badge>
                    ) : (
                      <Badge variant="secondary">All Members</Badge>
                    )}
                  </TableCell>
                  <TableCell>{p.pinToNav ? <Badge variant="outline">Pinned</Badge> : null}</TableCell>
                  <TableCell>
                    <Button asChild size="sm" variant="ghost">
                      <Link href={`/admin/projects/${p.id}`}>Edit</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
