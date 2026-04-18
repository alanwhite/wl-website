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
import { Input } from "@/components/ui/input";

export const dynamic = "force-dynamic";

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await auth();
  if (!session?.user || session.user.status !== "APPROVED") redirect("/login");

  const managerRoles = await getMemberManagerRoles();
  if (!canManageMembers(session.user, managerRoles)) redirect("/dashboard");

  const params = await searchParams;
  const query = params.q?.trim();

  const users = await prisma.user.findMany({
    where: query
      ? {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { email: { contains: query, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      status: true,
      tierName: true,
      tierLevel: true,
      createdAt: true,
    },
    take: 100,
  });

  // Count pending registrations for the badge
  const pendingCount = await prisma.registration.count({
    where: { user: { status: "PENDING_REVIEW" } },
  });

  const statusColor = (status: string) => {
    switch (status) {
      case "PENDING_REVIEW": return "outline" as const;
      case "APPROVED": return "default" as const;
      case "REJECTED": return "destructive" as const;
      case "SUSPENDED": return "secondary" as const;
      default: return "outline" as const;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Members</h1>
        <Button asChild variant={pendingCount > 0 ? "default" : "outline"} size="sm">
          <Link href="/members/registrations">
            Registrations
            {pendingCount > 0 && (
              <Badge variant="secondary" className="ml-2">{pendingCount}</Badge>
            )}
          </Link>
        </Button>
      </div>

      <form action="/members" method="get">
        <Input
          name="q"
          placeholder="Search by name or email..."
          defaultValue={query ?? ""}
          className="max-w-sm"
        />
      </form>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Tier</TableHead>
              <TableHead>Status</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  {query ? "No members match your search" : "No members yet"}
                </TableCell>
              </TableRow>
            )}
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.name ?? "—"}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.tierName}</TableCell>
                <TableCell>
                  <Badge variant={statusColor(user.status)}>{user.status}</Badge>
                </TableCell>
                <TableCell>
                  <Button asChild size="sm" variant="ghost">
                    <Link href={`/members/${user.id}`}>View</Link>
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
