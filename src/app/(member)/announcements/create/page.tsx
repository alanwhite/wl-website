import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getAnnouncementManagerRoles, canManageAnnouncements } from "@/lib/config";
import { MemberAnnouncementForm } from "@/components/announcements/announcement-form";

export const dynamic = "force-dynamic";

export default async function CreateAnnouncementPage() {
  const session = await auth();
  if (!session?.user || session.user.status !== "APPROVED") redirect("/login");

  const managerRoles = await getAnnouncementManagerRoles();
  if (!canManageAnnouncements(session.user, managerRoles)) redirect("/announcements");

  return (
    <div className="mx-auto max-w-2xl">
      <MemberAnnouncementForm />
    </div>
  );
}
