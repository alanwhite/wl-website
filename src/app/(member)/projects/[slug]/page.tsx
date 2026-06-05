import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  canAccessProject,
  canAccessPoll,
  canContributeToProject,
  canManageProjects,
  getProjectManagerRoles,
  getProjectLabel,
  getPollManagerRoles,
  canManagePolls,
  getDocumentManagerRoles,
  canManageDocuments,
  getCalendarManagerRoles,
  canManageCalendar,
  getAnnouncementManagerRoles,
  canManageAnnouncements,
  getFormCreatorRoles,
  canCreateForms,
} from "@/lib/config";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PollCard } from "@/components/polls/poll-card";
import { CategoryCard } from "@/components/library/category-card";
import { AnnouncementGallery } from "@/components/announcements/announcement-gallery";
import { EventDateRange } from "@/components/shared/event-date-range";
import { format } from "date-fns";
import {
  CalendarDays,
  ClipboardList,
  ExternalLink,
  FolderOpen,
  ListTodo,
  MapPin,
  Megaphone,
  Pencil,
  Pin,
  Plus,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const session = await auth();
  if (!session?.user || session.user.status !== "APPROVED") redirect("/login");

  const { slug } = await params;

  const project = await prisma.project.findUnique({
    where: { slug },
    include: {
      polls: {
        orderBy: [{ closedAt: "asc" }, { createdAt: "desc" }],
        include: {
          _count: { select: { votes: true } },
          votes: { where: { userId: session.user.id }, select: { id: true } },
        },
      },
      categories: {
        where: { parentId: null },
        orderBy: { sortOrder: "asc" },
        include: { _count: { select: { documents: true, children: true } } },
      },
      events: {
        orderBy: { startDate: "asc" },
      },
      announcements: {
        where: {
          published: true,
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
        orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
      },
      forms: {
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { submissions: { where: { status: "pending" } } } } },
      },
    },
  });

  if (!project) notFound();

  const [
    projectManagerRoles,
    label,
    pollManagerRoles,
    documentManagerRoles,
    calendarManagerRoles,
    announcementManagerRoles,
    formCreatorRoles,
  ] = await Promise.all([
    getProjectManagerRoles(),
    getProjectLabel(),
    getPollManagerRoles(),
    getDocumentManagerRoles(),
    getCalendarManagerRoles(),
    getAnnouncementManagerRoles(),
    getFormCreatorRoles(),
  ]);

  const isManager = canManageProjects(session.user, projectManagerRoles);
  if (!isManager && !canAccessProject(session.user, project)) {
    redirect("/projects");
  }

  // Contributors can add content — per section, they also need that
  // content type's manage rights (same rule as the standalone pages).
  const isContributor = isManager || canContributeToProject(session.user, project);
  const isAdmin = (session.user.tierLevel ?? 0) >= 999;
  const canAddPolls = isContributor && canManagePolls(session.user, pollManagerRoles);
  const canAddFolders = isContributor && canManageDocuments(session.user, documentManagerRoles);
  const canAddEvents = isContributor && canManageCalendar(session.user, calendarManagerRoles);
  const canAddAnnouncements = isContributor && canManageAnnouncements(session.user, announcementManagerRoles);
  const canAddForms = isContributor && canCreateForms(session.user, formCreatorRoles);
  const managesForms = isAdmin || canCreateForms(session.user, formCreatorRoles);

  // Layered filtering: the project gate has passed, now apply each artifact's own targeting
  const polls = isAdmin ? project.polls : project.polls.filter((p) => canAccessPoll(session.user, p));
  const categories = isAdmin
    ? project.categories
    : project.categories.filter((c) => canAccessPoll(session.user, c));
  const now = new Date();
  const events = (isAdmin ? project.events : project.events.filter((e) => canAccessPoll(session.user, e)));
  const upcomingEvents = events.filter((e) => e.endDate >= now);
  const pastEvents = events.filter((e) => e.endDate < now);
  const visibleForms = project.forms.filter(
    (f) =>
      f.published ||
      isAdmin ||
      f.managerRoleSlugs.some((s) => session.user.roleSlugs?.includes(s)),
  );

  const isEmpty =
    polls.length === 0 &&
    categories.length === 0 &&
    events.length === 0 &&
    project.announcements.length === 0 &&
    visibleForms.length === 0;

  function sectionHeader(icon: React.ReactNode, title: string, addHref?: string, addLabel?: string) {
    return (
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          {icon}
          {title}
        </h2>
        {addHref && (
          <Button asChild size="sm" variant="outline">
            <Link href={addHref}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              {addLabel}
            </Link>
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <nav className="text-sm text-muted-foreground">
          <Link href="/projects" className="hover:text-foreground">
            {label}s
          </Link>
        </nav>
        <div className="flex items-start justify-between gap-2">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold">
              {project.name}
              {project.status === "ARCHIVED" && <Badge variant="secondary">Archived</Badge>}
            </h1>
            {project.description && (
              <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{project.description}</p>
            )}
          </div>
          {isManager && (
            <Button asChild variant="outline" size="sm">
              <Link href={`/admin/projects/${project.id}`}>
                <Pencil className="mr-1 h-3.5 w-3.5" />
                Edit
              </Link>
            </Button>
          )}
        </div>
      </div>

      {isEmpty && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Nothing here yet.
            {isContributor && " Use the buttons below to add polls, folders, events and more."}
          </CardContent>
        </Card>
      )}

      {/* Announcements */}
      {(project.announcements.length > 0 || canAddAnnouncements) && (
        <section className="space-y-3">
          {sectionHeader(
            <Megaphone className="h-4 w-4" />,
            "Announcements",
            canAddAnnouncements ? `/announcements/create?projectId=${project.id}` : undefined,
            "New",
          )}
          {project.announcements.map((a) => (
            <Card key={a.id} className="overflow-hidden">
              <AnnouncementGallery images={a.imageUrls} />
              <CardContent className="py-4">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{a.title}</h3>
                  {a.pinned && <Pin className="h-3.5 w-3.5 text-muted-foreground" />}
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{a.content}</p>
                <p className="mt-2 text-xs text-muted-foreground">{format(a.createdAt, "d MMM yyyy")}</p>
              </CardContent>
            </Card>
          ))}
        </section>
      )}

      {/* Polls */}
      {(polls.length > 0 || canAddPolls) && (
        <section className="space-y-3">
          {sectionHeader(
            <ListTodo className="h-4 w-4" />,
            "Polls",
            canAddPolls ? `/polls/create?projectId=${project.id}` : undefined,
            "New Poll",
          )}
          {polls.length === 0 && <p className="text-sm text-muted-foreground">No polls yet.</p>}
          {polls.map((poll) => (
            <PollCard
              key={poll.id}
              id={poll.id}
              title={poll.title}
              isAnonymous={poll.isAnonymous}
              isClosed={!!poll.closedAt}
              totalVotes={poll._count.votes}
              hasVoted={poll.votes.length > 0}
              createdAt={poll.createdAt}
            />
          ))}
        </section>
      )}

      {/* Document folders */}
      {(categories.length > 0 || canAddFolders) && (
        <section className="space-y-3">
          {sectionHeader(
            <FolderOpen className="h-4 w-4" />,
            "Documents",
            canAddFolders ? `/admin/documents/new?projectId=${project.id}` : undefined,
            "New Folder",
          )}
          {categories.length === 0 && <p className="text-sm text-muted-foreground">No folders yet.</p>}
          {categories.map((cat) => (
            <CategoryCard
              key={cat.id}
              slug={cat.slug}
              name={cat.name}
              description={cat.description}
              documentCount={cat._count.documents}
              childCount={cat._count.children}
            />
          ))}
        </section>
      )}

      {/* Events */}
      {(events.length > 0 || canAddEvents) && (
        <section className="space-y-3">
          {sectionHeader(
            <CalendarDays className="h-4 w-4" />,
            "Events",
            canAddEvents ? `/calendar/create?projectId=${project.id}` : undefined,
            "Add Event",
          )}
          {events.length === 0 && <p className="text-sm text-muted-foreground">No events yet.</p>}
          {upcomingEvents.map((event) => (
            <Link key={event.id} href={`/calendar/${event.id}`} className="block">
              <Card className="transition-colors hover:bg-muted/50">
                <CardContent className="py-4">
                  <h3 className="font-semibold">{event.title}</h3>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <CalendarDays className="h-3.5 w-3.5" />
                      <EventDateRange
                        startDate={event.startDate}
                        endDate={event.endDate}
                        allDay={event.allDay}
                      />
                    </span>
                    {event.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {event.location}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
          {pastEvents.length > 0 && (
            <details className="text-sm">
              <summary className="cursor-pointer text-muted-foreground">
                {pastEvents.length} past event{pastEvents.length === 1 ? "" : "s"}
              </summary>
              <div className="mt-2 space-y-2">
                {pastEvents.map((event) => (
                  <Link key={event.id} href={`/calendar/${event.id}`} className="block">
                    <Card className="transition-colors hover:bg-muted/50">
                      <CardContent className="py-3">
                        <span className="font-medium">{event.title}</span>
                        <span className="ml-2 text-xs text-muted-foreground">
                          {format(event.startDate, "d MMM yyyy")}
                        </span>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </details>
          )}
        </section>
      )}

      {/* Forms */}
      {(visibleForms.length > 0 || canAddForms) && (
        <section className="space-y-3">
          {sectionHeader(
            <ClipboardList className="h-4 w-4" />,
            "Forms",
            canAddForms ? `/forms/manage/create?projectId=${project.id}` : undefined,
            "New Form",
          )}
          {visibleForms.length === 0 && <p className="text-sm text-muted-foreground">No forms yet.</p>}
          {visibleForms.map((form) => {
            const managesThis =
              isAdmin || form.managerRoleSlugs.some((s) => session.user.roleSlugs?.includes(s));
            return (
              <Card key={form.id}>
                <CardContent className="flex items-center justify-between gap-3 py-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{form.title}</h3>
                      {!form.published && <Badge variant="outline" className="text-xs">Draft</Badge>}
                      {form.closedAt && <Badge variant="secondary" className="text-xs">Closed</Badge>}
                      {managesThis && form._count.submissions > 0 && (
                        <Badge className="text-xs">{form._count.submissions} pending</Badge>
                      )}
                    </div>
                    {form.description && (
                      <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{form.description}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    {form.published && !form.closedAt && (
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/forms/${form.slug}`} target="_blank">
                          <ExternalLink className="mr-1 h-3.5 w-3.5" />
                          Open
                        </Link>
                      </Button>
                    )}
                    {managesThis && (
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/forms/${form.slug}/submissions`}>Submissions</Link>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </section>
      )}
    </div>
  );
}
