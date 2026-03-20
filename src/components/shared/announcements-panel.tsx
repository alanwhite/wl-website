import { getActiveAnnouncements } from "@/lib/actions/announcements";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Megaphone, Pin } from "lucide-react";

export async function AnnouncementsPanel() {
  const announcements = await getActiveAnnouncements();

  if (announcements.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Megaphone className="h-5 w-5" />
        <h2 className="text-lg font-semibold">Announcements</h2>
      </div>
      {announcements.map((a) => (
        <Card key={a.id}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              {a.pinned && <Pin className="h-3 w-3" />}
              {a.title}
              {a.pinned && (
                <Badge variant="outline" className="text-xs">
                  Pinned
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {a.content}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
