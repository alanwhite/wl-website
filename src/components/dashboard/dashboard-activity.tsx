import Link from "next/link";
import Image from "next/image";
import { format } from "date-fns";
import { Megaphone, Calendar, ListTodo, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { canAccessPoll, getGroupMemberFields } from "@/lib/config";
import { isFieldVisible } from "@/lib/registration-fields";

interface User {
  id: string;
  roleSlugs?: string[];
  tierLevel?: number;
}

interface Props {
  user: User;
  /** When true, wraps the sections in a centered max-w-3xl container with extra spacing
   *  (suitable for placing below a full-bleed welcome-page hero). When false (default),
   *  emits a plain space-y stack the caller can place inside its own layout. */
  standalone?: boolean;
}

/**
 * Surfaces "what's going on" on the member dashboard — action items needing
 * the user's input, upcoming events, and the latest announcements. Each card
 * renders only if it has content, so an empty board returns null.
 */
export async function DashboardActivity({ user, standalone = false }: Props) {
  const now = new Date();

  const [announcements, events, openPolls, userWithGroup, memberFields] = await Promise.all([
    prisma.announcement.findMany({
      where: {
        published: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
      take: 3,
    }),
    prisma.calendarEvent.findMany({
      where: { endDate: { gte: now } },
      orderBy: { startDate: "asc" },
      take: 10,
    }),
    prisma.poll.findMany({
      where: { closedAt: null },
      select: {
        id: true,
        title: true,
        targetRoleSlugs: true,
        targetMinTierLevel: true,
        votes: { where: { userId: user.id }, select: { id: true }, take: 1 },
      },
    }),
    prisma.user.findUnique({
      where: { id: user.id },
      include: {
        groups: {
          take: 1,
          select: {
            id: true,
            rsvpStatus: true,
            groupMembers: { select: { data: true } },
          },
        },
      },
    }),
    getGroupMemberFields(),
  ]);

  // Visibility-filter events by tier + role
  const isAdmin = (user.tierLevel ?? 0) >= 999;
  const visibleEvents = events
    .filter((e) => {
      if (isAdmin) return true;
      if (e.targetMinTierLevel !== null && (user.tierLevel ?? 0) < e.targetMinTierLevel) return false;
      if (e.targetRoleSlugs.length > 0 && !e.targetRoleSlugs.some((s) => user.roleSlugs?.includes(s))) return false;
      return true;
    })
    .slice(0, 3);

  const unvotedPolls = openPolls
    .filter((p) => canAccessPoll(user, p) && p.votes.length === 0)
    .slice(0, 3);

  // Action items derived from group state + open polls
  const actionItems: { key: string; label: string; href: string }[] = [];
  const group = userWithGroup?.groups[0];
  if (group) {
    if (group.rsvpStatus === "pending") {
      actionItems.push({ key: "group-rsvp", label: "Let us know if you can make it", href: "/groups" });
    } else if (group.rsvpStatus === "attending" && memberFields.length > 0) {
      const incomplete = group.groupMembers.filter((m) => {
        const data = (m.data as Record<string, string>) ?? {};
        return !memberFields.every((f) => {
          if (!f.required) return true;
          if (!isFieldVisible(f, data)) return true;
          return data[f.name] !== undefined && data[f.name] !== "";
        });
      }).length;
      if (incomplete > 0) {
        actionItems.push({
          key: "group-choices",
          label: `${incomplete} ${incomplete === 1 ? "choice" : "choices"} still to be made`,
          href: "/groups",
        });
      }
    }
  }
  unvotedPolls.forEach((p) =>
    actionItems.push({ key: `poll-${p.id}`, label: `Vote: ${p.title}`, href: `/polls/${p.id}` }),
  );

  if (actionItems.length === 0 && visibleEvents.length === 0 && announcements.length === 0) {
    return null;
  }

  const wrapperClass = standalone
    ? "mx-auto mt-8 max-w-3xl space-y-5 px-4 pb-12"
    : "space-y-5";

  return (
    <div className={wrapperClass}>
      {actionItems.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ListTodo className="h-4 w-4" /> Just for you
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {actionItems.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className="flex items-center justify-between rounded-md border bg-card px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <span>{item.label}</span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      {visibleEvents.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-4 w-4" /> Coming up
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {visibleEvents.map((e) => (
              <Link
                key={e.id}
                href={`/calendar/${e.id}`}
                className="flex items-center justify-between rounded-md border bg-card px-3 py-2 text-sm transition-colors hover:bg-accent"
              >
                <div className="min-w-0">
                  <div className="font-medium">{e.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {e.allDay ? format(e.startDate, "EEE d MMM") : format(e.startDate, "EEE d MMM, HH:mm")}
                    {e.location ? ` · ${e.location}` : ""}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </Link>
            ))}
            <Link
              href="/calendar"
              className="block pt-1 text-xs text-muted-foreground hover:text-foreground"
            >
              See full calendar →
            </Link>
          </CardContent>
        </Card>
      )}

      {announcements.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Megaphone className="h-4 w-4" /> Latest news
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {announcements.map((a) => (
              <Link
                key={a.id}
                href="/announcements"
                className="block overflow-hidden rounded-md border bg-card transition-colors hover:bg-accent"
              >
                {a.imageUrls.length > 0 && (
                  <div className="relative mx-auto aspect-[2/1] w-full max-w-xl bg-muted">
                    <Image
                      src={a.imageUrls[0]}
                      alt=""
                      fill
                      sizes="(max-width: 768px) 100vw, 576px"
                      className="object-cover"
                      unoptimized
                    />
                    {a.imageUrls.length > 1 && (
                      <div className="absolute bottom-2 right-2 rounded bg-black/60 px-2 py-1 text-xs font-medium text-white">
                        +{a.imageUrls.length - 1} more
                      </div>
                    )}
                  </div>
                )}
                <div className="px-3 py-2">
                  <div className="text-sm font-medium">{a.title}</div>
                  <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-xs text-muted-foreground">
                    {a.content}
                  </p>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {format(a.createdAt, "d MMM yyyy")}
                  </div>
                </div>
              </Link>
            ))}
            <Link
              href="/announcements"
              className="block pt-1 text-xs text-muted-foreground hover:text-foreground"
            >
              See all announcements →
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
