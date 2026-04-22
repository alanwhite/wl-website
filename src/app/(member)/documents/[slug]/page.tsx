import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { canUploadToCategory, canAccessPoll, getDocumentManagerRoles, canManageDocuments } from "@/lib/config";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { DocumentList } from "@/components/library/document-list";
import { DocumentUpload } from "@/components/library/document-upload";
import { MoveDialog } from "@/components/library/move-dialog";
import { buildFolderTree } from "@/lib/folder-tree";
import { CategoryCard } from "@/components/library/category-card";
import { ChevronRight, Plus } from "lucide-react";

export const dynamic = "force-dynamic";

// Build breadcrumb trail by walking up parents
async function getBreadcrumbs(categoryId: string): Promise<{ name: string; slug: string }[]> {
  const trail: { name: string; slug: string }[] = [];
  let currentId: string | null = categoryId;

  while (currentId) {
    const cat = await prisma.libraryCategory.findUnique({
      where: { id: currentId },
      select: { name: true, slug: true, parentId: true },
    }) as { name: string; slug: string; parentId: string | null } | null;
    if (!cat) break;
    trail.unshift({ name: cat.name, slug: cat.slug });
    currentId = cat.parentId;
  }

  return trail;
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.status !== "APPROVED") redirect("/login");

  const { slug } = await params;

  const category = await prisma.libraryCategory.findUnique({
    where: { slug },
    include: {
      documents: {
        orderBy: { createdAt: "desc" },
        include: { uploader: { select: { name: true } } },
      },
      children: {
        orderBy: { sortOrder: "asc" },
        include: { _count: { select: { documents: true, children: true } } },
      },
    },
  });

  if (!category) notFound();

  const isAdmin = (session.user.tierLevel ?? 0) >= 999;
  if (!isAdmin && !canAccessPoll(session.user, category)) {
    redirect("/documents");
  }

  const canUpload = canUploadToCategory(session.user, category);
  const managerRoles = await getDocumentManagerRoles();
  const canManageCats = canManageDocuments(session.user, managerRoles);

  const breadcrumbs = await getBreadcrumbs(category.id);
  const folderTree = canManageCats ? await buildFolderTree(session.user) : [];

  // Filter children by access
  const accessibleChildren = isAdmin
    ? category.children
    : category.children.filter((c) => canAccessPoll(session.user, c));

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/documents" className="hover:text-foreground">Documents</Link>
        {breadcrumbs.map((crumb) => (
          <span key={crumb.slug} className="flex items-center gap-1">
            <ChevronRight className="h-3.5 w-3.5" />
            <Link href={`/documents/${crumb.slug}`} className="hover:text-foreground">
              {crumb.name}
            </Link>
          </span>
        ))}
      </nav>

      {/* Category header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">{category.name}</h1>
          {category.description && (
            <p className="mt-1 text-muted-foreground">{category.description}</p>
          )}
        </div>
        <div className="flex shrink-0 gap-2">
          {(category.targetRoleSlugs.length > 0 || category.targetMinTierLevel != null) && (
            <Badge variant="outline">Restricted</Badge>
          )}
        </div>
      </div>

      {/* Sub-categories */}
      {accessibleChildren.length > 0 && (
        <div className="space-y-3">
          {accessibleChildren.map((child) => (
            <div key={child.id} className="flex items-center gap-2">
              <div className="flex-1">
                <CategoryCard
                  slug={child.slug}
                  name={child.name}
                  description={child.description}
                  documentCount={child._count.documents}
                  childCount={child._count.children}
                />
              </div>
              {canManageCats && (
                <MoveDialog
                  itemId={child.id}
                  itemName={child.name}
                  itemType="category"
                  currentCategoryId={category.id}
                  folders={folderTree}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* New sub-category button */}
      {canManageCats && (
        <Button asChild variant="outline" size="sm">
          <Link href={`/admin/documents/new?parentId=${category.id}`}>
            <Plus className="mr-1 h-4 w-4" />
            New Sub-folder
          </Link>
        </Button>
      )}

      {/* Documents */}
      {category.documents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Documents</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <DocumentList
              documents={category.documents.map((d) => ({
                ...d,
                createdAt: d.createdAt,
              }))}
              canManage={canUpload}
              canMove={canManageCats}
              categoryId={category.id}
              folders={folderTree}
            />
          </CardContent>
        </Card>
      )}

      {/* Upload */}
      {canUpload && (
        <Card>
          <CardContent className="pt-4">
            <DocumentUpload categoryId={category.id} />
          </CardContent>
        </Card>
      )}

      {category.documents.length === 0 && accessibleChildren.length === 0 && (
        <p className="text-muted-foreground">This folder is empty.</p>
      )}
    </div>
  );
}
