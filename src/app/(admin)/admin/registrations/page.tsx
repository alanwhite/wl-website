import { prisma } from "@/lib/prisma";
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
  const registrations = await prisma.registration.findMany({
    include: {
      user: { select: { id: true, name: true, email: true, status: true, image: true } },
      _count: { select: { documents: true } },
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
      <h1 className="text-3xl font-bold">Registrations</h1>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Documents</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {registrations.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No registrations yet
                </TableCell>
              </TableRow>
            )}
            {registrations.map((reg) => (
              <TableRow key={reg.id}>
                <TableCell className="font-medium">{reg.user.name ?? "—"}</TableCell>
                <TableCell>{reg.user.email}</TableCell>
                <TableCell>
                  <Badge variant={statusColor(reg.user.status)}>
                    {reg.user.status}
                  </Badge>
                </TableCell>
                <TableCell>{reg._count.documents}</TableCell>
                <TableCell>{format(reg.createdAt, "MMM d, yyyy")}</TableCell>
                <TableCell>
                  <Button asChild size="sm" variant="ghost">
                    <Link href={`/admin/registrations/${reg.id}`}>Review</Link>
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
