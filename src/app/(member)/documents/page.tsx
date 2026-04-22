import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { canAccessPoll, getDocumentManagerRoles, canManageDocuments } from "@/lib/config";
import { CategoryCard } from "@/components/library/category-card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DocumentsPage() {
  const session = await auth();
  if (!session?.user || session.user.status !== "APPROVED") redirect("/login");

  const managerRoles = await getDocumentManagerRoles();
  const canManage = canManageDocuments(session.user, managerRoles);

  // Only show top-level categories (no parent)
  const categories = await prisma.libraryCategory.findMany({
    where: { parentId: null },
    orderBy: { sortOrder: "asc" },
    include: {
      _count: { select: { documents: true, children: true } },
    },
  });

  const isAdmin = (session.user.tierLevel ?? 0) >= 999;
  const accessible = isAdmin
    ? categories
    : categories.filter((c) => canAccessPoll(session.user, c));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Documents</h1>
        {canManage && (
          <Button asChild size="sm">
            <Link href="/admin/documents/new">
              <Plus className="mr-1 h-4 w-4" />
              New Category
            </Link>
          </Button>
        )}
      </div>

      {accessible.length === 0 ? (
        <p className="text-muted-foreground">No document categories available.</p>
      ) : (
        <div className="space-y-4">
          {accessible.map((cat) => (
            <CategoryCard
              key={cat.id}
              slug={cat.slug}
              name={cat.name}
              description={cat.description}
              documentCount={cat._count.documents}
              childCount={cat._count.children}
            />
          ))}
        </div>
      )}
    </div>
  );
}
