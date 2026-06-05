import Link from "next/link";
import { format } from "date-fns";
import { FolderKanban, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { canAccessProject, canAccessPoll, getProjectLabel } from "@/lib/config";

interface User {
  id: string;
  roleSlugs?: string[];
  tierLevel?: number;
}

/**
 * Dashboard card listing the active projects the user can access, each with a
 * short activity summary (open polls awaiting their vote, next upcoming event,
 * announcements from the last week). Enabled per tenant via a
 * `{ "type": "projects" }` entry in the dashboard.cards config. Renders null
 * when the user has no accessible projects.
 */
export async function DashboardProjects({ user, title }: { user: User; title?: string }) {
  const now = new Date();
  const recentCutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [projects, label] = await Promise.all([
    prisma.project.findMany({
      where: { status: "ACTIVE" },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: {
        polls: {
          where: { closedAt: null },
          select: {
            targetRoleSlugs: true,
            targetMinTierLevel: true,
            votes: { where: { userId: user.id }, select: { id: true }, take: 1 },
          },
        },
        events: {
          where: { endDate: { gte: now } },
          orderBy: { startDate: "asc" },
          select: {
            startDate: true,
            allDay: true,
            targetRoleSlugs: true,
            targetMinTierLevel: true,
          },
        },
        announcements: {
          where: {
            published: true,
            createdAt: { gt: recentCutoff },
            OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
          },
          select: { id: true },
        },
      },
    }),
    getProjectLabel(),
  ]);

  const isAdmin = (user.tierLevel ?? 0) >= 999;
  const accessible = projects.filter((p) => isAdmin || canAccessProject(user, p));
  if (accessible.length === 0) return null;

  const rows = accessible.map((p) => {
    // Layered: project gate already passed, apply each artifact's own targeting
    const unvotedPolls = p.polls.filter(
      (poll) => (isAdmin || canAccessPoll(user, poll)) && poll.votes.length === 0,
    ).length;
    const nextEvent = p.events.find((e) => isAdmin || canAccessPoll(user, e));

    const parts: string[] = [];
    if (unvotedPolls > 0) parts.push(`${unvotedPolls} open poll${unvotedPolls === 1 ? "" : "s"}`);
    if (nextEvent) parts.push(`event ${format(nextEvent.startDate, "EEE d MMM")}`);
    if (p.announcements.length > 0) {
      parts.push(`${p.announcements.length} new announcement${p.announcements.length === 1 ? "" : "s"}`);
    }

    return { slug: p.slug, name: p.name, summary: parts.join(" · ") };
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <FolderKanban className="h-4 w-4" /> {title ?? `${label}s`}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        {rows.map((row) => (
          <Link
            key={row.slug}
            href={`/projects/${row.slug}`}
            className="flex items-center justify-between rounded-md border bg-card px-3 py-2 text-sm transition-colors hover:bg-accent"
          >
            <div className="min-w-0">
              <div className="font-medium">{row.name}</div>
              {row.summary && (
                <div className="text-xs text-muted-foreground">{row.summary}</div>
              )}
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </Link>
        ))}
        <Link
          href="/projects"
          className="block pt-1 text-xs text-muted-foreground hover:text-foreground"
        >
          See all {label.toLowerCase()}s →
        </Link>
      </CardContent>
    </Card>
  );
}
