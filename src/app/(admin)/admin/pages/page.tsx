import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Button } from "@/components/ui/button";
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
import { Plus } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminPagesPage() {
  const pages = await prisma.page.findMany({
    orderBy: { sortOrder: "asc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Pages</h1>
        <Button asChild>
          <Link href="/admin/pages/new">
            <Plus className="mr-2 h-4 w-4" />
            New Page
          </Link>
        </Button>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pages.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No pages yet
                </TableCell>
              </TableRow>
            )}
            {pages.map((page) => (
              <TableRow key={page.id}>
                <TableCell className="font-medium">{page.title}</TableCell>
                <TableCell className="text-muted-foreground">/p/{page.slug}</TableCell>
                <TableCell>
                  <Badge variant={page.published ? "default" : "secondary"}>
                    {page.published ? "Published" : "Draft"}
                  </Badge>
                </TableCell>
                <TableCell>{format(page.updatedAt, "MMM d, yyyy")}</TableCell>
                <TableCell>
                  <Button asChild size="sm" variant="ghost">
                    <Link href={`/admin/pages/${page.id}`}>Edit</Link>
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
