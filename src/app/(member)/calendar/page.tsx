import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCalendarManagerRoles, canManageCalendar, canAccessPoll } from "@/lib/config";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { CalendarDays, MapPin, Plus, Link as LinkIcon } from "lucide-react";
import { CalendarSubscribe } from "@/components/calendar/calendar-subscribe";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const session = await auth();
  if (!session?.user || session.user.status !== "APPROVED") redirect("/login");

  const managerRoles = await getCalendarManagerRoles();
  const canManage = canManageCalendar(session.user, managerRoles);

  const events = await prisma.calendarEvent.findMany({
    where: {
      OR: [
        { startDate: { gte: new Date() } },
        { recurrence: { not: null }, recurrenceEnd: { gte: new Date() } },
        { recurrence: { not: null }, recurrenceEnd: null },
      ],
    },
    orderBy: { startDate: "asc" },
    include: { creator: { select: { name: true } } },
    take: 50,
  });

  // Filter by role/tier access
  const isAdmin = (session.user.tierLevel ?? 0) >= 999;
  const accessible = isAdmin
    ? events
    : events.filter((e) => canAccessPoll(session.user, e));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Calendar</h1>
        <div className="flex gap-2">
          <CalendarSubscribe />
          {canManage && (
            <Button asChild size="sm">
              <Link href="/calendar/create">
                <Plus className="mr-1 h-4 w-4" />
                Add Event
              </Link>
            </Button>
          )}
        </div>
      </div>

      {accessible.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No upcoming events
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {accessible.map((event) => (
            <Link key={event.id} href={`/calendar/${event.id}`} className="block">
              <Card className="transition-colors hover:bg-muted/50">
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold">{event.title}</h3>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <CalendarDays className="h-3.5 w-3.5" />
                          {event.allDay
                            ? format(event.startDate, "EEE d MMM yyyy")
                            : format(event.startDate, "EEE d MMM yyyy, h:mm a")}
                        </span>
                        {event.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" />
                            {event.location}
                          </span>
                        )}
                      </div>
                      {event.description && (
                        <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                          {event.description}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      {event.recurrence && (
                        <Badge variant="outline" className="text-xs">{event.recurrence}</Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
