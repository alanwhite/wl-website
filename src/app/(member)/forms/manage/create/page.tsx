import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getFormCreatorRoles, canCreateForms } from "@/lib/config";
import { getContributableProjects } from "@/lib/project-access";
import { prisma } from "@/lib/prisma";
import { FormEditor } from "@/components/forms/form-editor";

export const dynamic = "force-dynamic";

export default async function CreateFormPage({
  searchParams,
}: {
  searchParams: Promise<{ projectId?: string }>;
}) {
  const session = await auth();
  if (!session?.user || session.user.status !== "APPROVED") redirect("/login");

  const creatorRoles = await getFormCreatorRoles();
  if (!canCreateForms(session.user, creatorRoles)) redirect("/dashboard");

  const { projectId } = await searchParams;

  const [roles, projects] = await Promise.all([
    prisma.role.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true },
    }),
    getContributableProjects(session.user),
  ]);

  return (
    <div className="mx-auto max-w-2xl">
      <FormEditor roles={roles} projects={projects} defaultProjectId={projectId} />
    </div>
  );
}
