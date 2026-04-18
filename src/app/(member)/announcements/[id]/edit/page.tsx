import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAnnouncementManagerRoles, canManageAnnouncements } from "@/lib/config";
import { MemberAnnouncementForm } from "@/components/announcements/announcement-form";

export const dynamic = "force-dynamic";

export default async function EditAnnouncementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user || session.user.status !== "APPROVED") redirect("/login");

  const managerRoles = await getAnnouncementManagerRoles();
  if (!canManageAnnouncements(session.user, managerRoles)) redirect("/announcements");

  const { id } = await params;
  const announcement = await prisma.announcement.findUnique({ where: { id } });
  if (!announcement) notFound();

  return (
    <div className="mx-auto max-w-2xl">
      <MemberAnnouncementForm announcement={announcement} />
    </div>
  );
}
