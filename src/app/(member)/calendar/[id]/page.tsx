import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCalendarManagerRoles, canManageCalendar } from "@/lib/config";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarDays, MapPin, Pencil } from "lucide-react";
import { LocalDate } from "@/components/shared/local-date";
import { DeleteEventButton } from "@/components/calendar/delete-event-button";

export const dynamic = "force-dynamic";

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user || session.user.status !== "APPROVED") redirect("/login");

  const { id } = await params;
  const event = await prisma.calendarEvent.findUnique({
    where: { id },
    include: { creator: { select: { name: true } } },
  });

  if (!event) notFound();

  const managerRoles = await getCalendarManagerRoles();
  const canManage = canManageCalendar(session.user, managerRoles);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <Button asChild variant="outline" size="sm">
          <Link href="/calendar">Back to Calendar</Link>
        </Button>
        {canManage && (
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/calendar/${event.id}/edit`}>
                <Pencil className="mr-1 h-3.5 w-3.5" />
                Edit
              </Link>
            </Button>
            <DeleteEventButton eventId={event.id} eventTitle={event.title} />
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{event.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4 text-sm">
            <span className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              {event.allDay
                ? <LocalDate date={event.startDate} dateFormat="EEEE d MMMM yyyy" />
                : <><LocalDate date={event.startDate} dateFormat="EEEE d MMMM yyyy, h:mm a" /> — <LocalDate date={event.endDate} dateFormat="h:mm a" /></>}
            </span>
            {event.location && (
              <span className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                {event.location}
              </span>
            )}
          </div>

          {event.recurrence && (
            <div className="flex items-center gap-2">
              <Badge variant="outline">Repeats {event.recurrence}</Badge>
              {event.recurrenceEnd && (
                <span className="text-sm text-muted-foreground">
                  until <LocalDate date={event.recurrenceEnd} dateFormat="d MMM yyyy" />
                </span>
              )}
            </div>
          )}

          {event.description && (
            <p className="whitespace-pre-wrap text-muted-foreground">{event.description}</p>
          )}

          <p className="text-xs text-muted-foreground">
            Created by {event.creator.name ?? "Unknown"} on <LocalDate date={event.createdAt} dateFormat="d MMM yyyy" />
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
