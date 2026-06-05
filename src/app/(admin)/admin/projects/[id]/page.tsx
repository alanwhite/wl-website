import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getProjectManagerRoles, canManageProjects, getProjectLabel } from "@/lib/config";
import { ProjectForm } from "@/components/admin/project-form";

export const dynamic = "force-dynamic";

export default async function AdminProjectEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user || session.user.status !== "APPROVED") redirect("/login");
  const managerRoles = await getProjectManagerRoles();
  if (!canManageProjects(session.user, managerRoles)) redirect("/dashboard");

  const { id } = await params;

  const [roles, tiers, label] = await Promise.all([
    prisma.role.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, slug: true } }),
    prisma.membershipTier.findMany({ where: { isSystem: false }, orderBy: { level: "asc" }, select: { id: true, name: true, level: true } }),
    getProjectLabel(),
  ]);

  if (id === "new") {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">New {label}</h1>
        <ProjectForm roles={roles} tiers={tiers} label={label} />
      </div>
    );
  }

  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) notFound();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Edit {label}</h1>
      <ProjectForm project={project} roles={roles} tiers={tiers} label={label} />
    </div>
  );
}
