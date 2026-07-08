import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getContactManagerRoles, canManageContacts } from "@/lib/config";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { ContactActions } from "@/components/admin/contact-actions";
import { PaginationControls } from "@/components/admin/pagination-controls";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await auth();
  if (!session?.user || session.user.status !== "APPROVED") redirect("/login");

  const managerRoles = await getContactManagerRoles();
  if (!canManageContacts(session.user, managerRoles)) redirect("/dashboard");

  const params = await searchParams;
  const page = parseInt(params.page ?? "1");

  const [contacts, total, unread] = await Promise.all([
    prisma.contactSubmission.findMany({
      orderBy: [{ read: "asc" }, { createdAt: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.contactSubmission.count(),
    prisma.contactSubmission.count({ where: { read: false } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">Inbox</h1>
        <p className="text-sm text-muted-foreground">
          Messages sent through the contact form
          {unread > 0 && ` · ${unread} unread`}
        </p>
      </div>

      {contacts.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No messages yet
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {contacts.map((c) => (
            <Card key={c.id} className={c.read ? "" : "border-l-4 border-l-primary"}>
              <CardContent className="flex items-start justify-between gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{c.subject ?? "No subject"}</span>
                    {!c.read && <Badge className="text-xs">New</Badge>}
                  </div>
                  <p className="mt-0.5 truncate text-sm text-muted-foreground">
                    {c.name} · {c.email}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {format(c.createdAt, "d MMM yyyy, HH:mm")}
                  </p>
                </div>
                <div className="shrink-0">
                  <ContactActions contact={c} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <PaginationControls currentPage={page} totalPages={totalPages} basePath="/inbox" />
    </div>
  );
}
