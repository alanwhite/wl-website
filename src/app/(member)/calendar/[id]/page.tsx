import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCalendarManagerRoles, canManageCalendar } from "@/lib/config";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarDays, MapPin, Pencil, Check, X, HelpCircle } from "lucide-react";
import { LocalDate } from "@/components/shared/local-date";
import { DeleteEventButton } from "@/components/calendar/delete-event-button";
import { RsvpButton } from "@/components/calendar/rsvp-button";

export const dynamic = "force-dynamic";

interface RsvpWithUser {
  userId: string;
  status: string;
  user: {
    id: string;
    name: string | null;
    userRoles: { role: { slug: string; name: string } }[];
  };
}

function groupByRole(
  rsvps: RsvpWithUser[],
  targetRoleSlugs: string[],
  roleNames: Record<string, string>,
) {
  const groups: Record<string, string[]> = {};
  const assigned = new Set<string>();

  // Initialise groups for each targeted role
  for (const slug of targetRoleSlugs) {
    groups[slug] = [];
  }

  // Assign each RSVP to their first matching targeted role
  for (const r of rsvps) {
    const userSlugs = r.user.userRoles.map((ur) => ur.role.slug);
    const matchingSlug = targetRoleSlugs.find((s) => userSlugs.includes(s));
    if (matchingSlug && !assigned.has(r.userId)) {
      groups[matchingSlug].push(r.user.name ?? "Unknown");
      assigned.add(r.userId);
    }
  }

  // Anyone not assigned to a targeted role goes to "Other"
  const unassigned = rsvps.filter((r) => !assigned.has(r.userId));
  if (unassigned.length > 0) {
    groups["_other"] = unassigned.map((r) => r.user.name ?? "Unknown");
  }

  return groups;
}

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
    include: {
      creator: { select: { name: true } },
      rsvps: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              userRoles: { include: { role: { select: { slug: true, name: true } } } },
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!event) notFound();

  const managerRoles = await getCalendarManagerRoles();
  const canManage = canManageCalendar(session.user, managerRoles);

  const myRsvp = event.rsvps.find((r) => r.userId === session.user.id);
  const accepted = event.rsvps.filter((r) => r.status === "accepted");
  const maybe = event.rsvps.filter((r) => r.status === "maybe");
  const declined = event.rsvps.filter((r) => r.status === "declined");

  const hasRoleTargeting = event.targetRoleSlugs.length > 0;

  // Get role display names for targeted slugs
  let roleNames: Record<string, string> = {};
  if (hasRoleTargeting) {
    const roles = await prisma.role.findMany({
      where: { slug: { in: event.targetRoleSlugs } },
      select: { slug: true, name: true },
    });
    roleNames = Object.fromEntries(roles.map((r) => [r.slug, r.name]));
  }

  const targetSlugs = event.targetRoleSlugs;

  function renderRsvpGroup(
    rsvps: RsvpWithUser[],
    label: string,
    icon: React.ReactNode,
    colorClass: string,
  ) {
    if (rsvps.length === 0) return null;

    if (hasRoleTargeting) {
      const groups = groupByRole(rsvps, targetSlugs, roleNames);
      return (
        <div>
          <p className={`flex items-center gap-1 text-sm font-medium ${colorClass}`}>
            {icon}
            {label} ({rsvps.length})
          </p>
          <div className="ml-5 mt-1 space-y-1">
            {targetSlugs.map((slug) => {
              const names = groups[slug] ?? [];
              return (
                <p key={slug} className="text-sm">
                  <span className="font-medium">{roleNames[slug] ?? slug}</span>
                  <span className="text-muted-foreground">
                    {" "}({names.length}){names.length > 0 ? `: ${names.join(", ")}` : ""}
                  </span>
                </p>
              );
            })}
            {groups["_other"] && groups["_other"].length > 0 && (
              <p className="text-sm">
                <span className="font-medium">Other</span>
                <span className="text-muted-foreground">
                  {" "}({groups["_other"].length}): {groups["_other"].join(", ")}
                </span>
              </p>
            )}
          </div>
        </div>
      );
    }

    return (
      <div>
        <p className={`flex items-center gap-1 text-sm font-medium ${colorClass}`}>
          {icon}
          {label} ({rsvps.length})
        </p>
        <p className="ml-5 text-sm text-muted-foreground">
          {rsvps.map((r) => r.user.name ?? "Unknown").join(", ")}
        </p>
      </div>
    );
  }

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
            Created by {event.creator?.name ?? "Unknown"} on <LocalDate date={event.createdAt} dateFormat="d MMM yyyy" />
          </p>
        </CardContent>
      </Card>

      {/* RSVP */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">RSVP</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <RsvpButton eventId={event.id} currentStatus={myRsvp?.status} />

          {event.rsvps.length > 0 && (
            <div className="space-y-3 pt-2">
              {renderRsvpGroup(
                accepted,
                "Accepted",
                <Check className="h-3.5 w-3.5" />,
                "text-green-600 dark:text-green-400",
              )}
              {renderRsvpGroup(
                maybe,
                "Maybe",
                <HelpCircle className="h-3.5 w-3.5" />,
                "text-amber-600 dark:text-amber-400",
              )}
              {renderRsvpGroup(
                declined,
                "Declined",
                <X className="h-3.5 w-3.5" />,
                "text-red-600 dark:text-red-400",
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
