import { prisma } from "@/lib/prisma";
import { AnnouncementForm } from "@/components/admin/announcement-form";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const dynamic = "force-dynamic";

export default async function AnnouncementsPage() {
  const announcements = await prisma.announcement.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Announcements</h1>

      <AnnouncementForm />

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Pinned</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {announcements.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No announcements yet
                </TableCell>
              </TableRow>
            ) : (
              announcements.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.title}</TableCell>
                  <TableCell>
                    <Badge variant={a.published ? "default" : "outline"}>
                      {a.published ? "Published" : "Draft"}
                    </Badge>
                  </TableCell>
                  <TableCell>{a.pinned ? "Yes" : "No"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {a.expiresAt ? format(a.expiresAt, "MMM d, yyyy") : "Never"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(a.createdAt, "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>
                    <AnnouncementForm
                      announcement={{
                        id: a.id,
                        title: a.title,
                        content: a.content,
                        published: a.published,
                        pinned: a.pinned,
                        expiresAt: a.expiresAt?.toISOString() ?? null,
                      }}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
