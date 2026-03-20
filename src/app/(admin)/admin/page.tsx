import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, ClipboardList, FileText, MessageSquare } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const [userCount, pendingCount, pageCount, contactCount] = await Promise.all([
    prisma.user.count(),
    prisma.registration.count({
      where: { user: { status: "PENDING_REVIEW" } },
    }),
    prisma.page.count(),
    prisma.contactSubmission.count({ where: { read: false } }),
  ]);

  const stats = [
    { label: "Total Users", value: userCount, icon: Users },
    { label: "Pending Registrations", value: pendingCount, icon: ClipboardList },
    { label: "Pages", value: pageCount, icon: FileText },
    { label: "Unread Contacts", value: contactCount, icon: MessageSquare },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Admin Overview</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
