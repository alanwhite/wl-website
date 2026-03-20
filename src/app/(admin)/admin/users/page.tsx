import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { UserActions } from "@/components/admin/user-actions";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const [users, tiers, roles] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      include: { userRoles: { include: { role: true } } },
    }),
    prisma.membershipTier.findMany({ orderBy: { level: "asc" } }),
    prisma.role.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Users</h1>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Tier</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.name ?? "—"}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{user.tierName}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {user.userRoles.length > 0 ? (
                      user.userRoles.map((ur) => (
                        <Badge key={ur.roleId} variant="outline">{ur.role.name}</Badge>
                      ))
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      user.status === "APPROVED" ? "default" :
                      user.status === "SUSPENDED" ? "destructive" : "outline"
                    }
                  >
                    {user.status}
                  </Badge>
                </TableCell>
                <TableCell>{format(user.createdAt, "MMM d, yyyy")}</TableCell>
                <TableCell>
                  <UserActions user={user} tiers={tiers} roles={roles} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
