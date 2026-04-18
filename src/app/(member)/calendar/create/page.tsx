import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getCalendarManagerRoles, canManageCalendar } from "@/lib/config";
import { EventForm } from "@/components/calendar/event-form";

export const dynamic = "force-dynamic";

export default async function CreateEventPage() {
  const session = await auth();
  if (!session?.user || session.user.status !== "APPROVED") redirect("/login");

  const managerRoles = await getCalendarManagerRoles();
  if (!canManageCalendar(session.user, managerRoles)) redirect("/calendar");

  return (
    <div className="mx-auto max-w-2xl">
      <EventForm />
    </div>
  );
}
