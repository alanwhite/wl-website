import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCalendarManagerRoles, canManageCalendar } from "@/lib/config";
import { EventForm } from "@/components/calendar/event-form";

export const dynamic = "force-dynamic";

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user || session.user.status !== "APPROVED") redirect("/login");

  const managerRoles = await getCalendarManagerRoles();
  if (!canManageCalendar(session.user, managerRoles)) redirect("/calendar");

  const { id } = await params;
  const event = await prisma.calendarEvent.findUnique({ where: { id } });
  if (!event) notFound();

  return (
    <div className="mx-auto max-w-2xl">
      <EventForm event={event} />
    </div>
  );
}
