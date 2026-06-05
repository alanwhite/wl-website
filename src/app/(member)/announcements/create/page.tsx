import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getAnnouncementManagerRoles, canManageAnnouncements } from "@/lib/config";
import { getContributableProjects } from "@/lib/project-access";
import { MemberAnnouncementForm } from "@/components/announcements/announcement-form";

export const dynamic = "force-dynamic";

export default async function CreateAnnouncementPage({
  searchParams,
}: {
  searchParams: Promise<{ projectId?: string }>;
}) {
  const session = await auth();
  if (!session?.user || session.user.status !== "APPROVED") redirect("/login");

  const managerRoles = await getAnnouncementManagerRoles();
  if (!canManageAnnouncements(session.user, managerRoles)) redirect("/announcements");

  const { projectId } = await searchParams;
  const projects = await getContributableProjects(session.user);

  return (
    <div className="mx-auto max-w-2xl">
      <MemberAnnouncementForm projects={projects} defaultProjectId={projectId} />
    </div>
  );
}
