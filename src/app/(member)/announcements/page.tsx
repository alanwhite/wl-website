import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAnnouncementManagerRoles, canManageAnnouncements } from "@/lib/config";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { Plus, Pin, Pencil } from "lucide-react";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

async function markAnnouncementsViewed(userId: string) {
  const profile = await prisma.userProfile.findUnique({
    where: { userId },
    select: { extra: true },
  });
  const extra = (profile?.extra as Record<string, unknown>) ?? {};
  extra.announcementsLastViewedAt = new Date().toISOString();
  const extraValue = extra as Prisma.InputJsonValue;
  await prisma.userProfile.upsert({
    where: { userId },
    update: { extra: extraValue },
    create: { userId, extra: extraValue },
  });
}

export default async function AnnouncementsPage() {
  const session = await auth();
  if (!session?.user || session.user.status !== "APPROVED") redirect("/login");

  const managerRoles = await getAnnouncementManagerRoles();
  const canManage = canManageAnnouncements(session.user, managerRoles);

  // Managers see all, regular members see published only
  const [announcements] = await Promise.all([
    prisma.announcement.findMany({
      where: canManage
        ? undefined
        : {
            published: true,
            OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
          },
      orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
    }),
    // Clear the unseen-announcements badge on the nav for this user
    markAnnouncementsViewed(session.user.id),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Announcements</h1>
        {canManage && (
          <Button asChild size="sm">
            <Link href="/announcements/create">
              <Plus className="mr-1 h-4 w-4" />
              New
            </Link>
          </Button>
        )}
      </div>

      {announcements.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No announcements
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => (
            <Card key={a.id}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{a.title}</h3>
                      {a.pinned && <Pin className="h-3.5 w-3.5 text-muted-foreground" />}
                      {!a.published && <Badge variant="outline" className="text-xs">Draft</Badge>}
                      {a.expiresAt && new Date(a.expiresAt) < new Date() && (
                        <Badge variant="secondary" className="text-xs">Expired</Badge>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap line-clamp-3">
                      {a.content}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {format(a.createdAt, "d MMM yyyy")}
                    </p>
                  </div>
                  {canManage && (
                    <Button asChild variant="ghost" size="sm" className="shrink-0">
                      <Link href={`/announcements/${a.id}/edit`}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
