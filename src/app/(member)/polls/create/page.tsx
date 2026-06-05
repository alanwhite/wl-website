import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getPollManagerRoles, canManagePolls } from "@/lib/config";
import { getContributableProjects } from "@/lib/project-access";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CreatePollForm } from "@/components/polls/create-poll-form";

export const dynamic = "force-dynamic";

export default async function CreatePollPage({
  searchParams,
}: {
  searchParams: Promise<{ projectId?: string }>;
}) {
  const session = await auth();
  if (!session?.user || session.user.status !== "APPROVED") redirect("/login");

  const managerRoles = await getPollManagerRoles();
  if (!canManagePolls(session.user, managerRoles)) redirect("/polls");

  const { projectId } = await searchParams;

  const [roles, tiers, projects] = await Promise.all([
    prisma.role.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, slug: true } }),
    prisma.membershipTier.findMany({ where: { isSystem: false }, orderBy: { level: "asc" }, select: { id: true, name: true, level: true } }),
    getContributableProjects(session.user),
  ]);

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>Create a Poll</CardTitle>
          <CardDescription>
            Create a new poll for members to vote on.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CreatePollForm roles={roles} tiers={tiers} projects={projects} defaultProjectId={projectId} />
        </CardContent>
      </Card>
    </div>
  );
}
