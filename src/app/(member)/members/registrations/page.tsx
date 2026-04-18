import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getMemberManagerRoles, canManageMembers } from "@/lib/config";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

export default async function RegistrationsPage() {
  const session = await auth();
  if (!session?.user || session.user.status !== "APPROVED") redirect("/login");

  const managerRoles = await getMemberManagerRoles();
  if (!canManageMembers(session.user, managerRoles)) redirect("/dashboard");

  const registrations = await prisma.registration.findMany({
    include: {
      user: { select: { id: true, name: true, email: true, status: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const statusColor = (status: string) => {
    switch (status) {
      case "PENDING_REVIEW": return "outline" as const;
      case "APPROVED": return "default" as const;
      case "REJECTED": return "destructive" as const;
      default: return "secondary" as const;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Registrations</h1>
        <Button asChild variant="outline" size="sm">
          <Link href="/members">Back to Members</Link>
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {registrations.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No registrations
                </TableCell>
              </TableRow>
            )}
            {registrations.map((reg) => (
              <TableRow key={reg.id}>
                <TableCell className="font-medium">{reg.user.name ?? "—"}</TableCell>
                <TableCell>{reg.user.email}</TableCell>
                <TableCell>
                  <Badge variant={statusColor(reg.user.status)}>{reg.user.status}</Badge>
                </TableCell>
                <TableCell>{format(reg.createdAt, "MMM d, yyyy")}</TableCell>
                <TableCell>
                  <Button asChild size="sm" variant="ghost">
                    <Link href={`/members/registrations/${reg.id}`}>Review</Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
