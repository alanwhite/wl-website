import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { canUploadToCategory, canAccessPoll } from "@/lib/config";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DocumentList } from "@/components/library/document-list";
import { DocumentUpload } from "@/components/library/document-upload";

export const dynamic = "force-dynamic";

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
    },
  });

  if (!category) notFound();

  // Access check (reuse canAccessPoll — same targeting shape)
  const isAdmin = (session.user.tierLevel ?? 0) >= 999;
  if (!isAdmin && !canAccessPoll(session.user, category)) {
    redirect("/documents");
  }

  const canManage = canUploadToCategory(session.user, category);

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <div>
              <CardTitle>{category.name}</CardTitle>
              {category.description && (
                <CardDescription>{category.description}</CardDescription>
              )}
            </div>
            {(category.targetRoleSlugs.length > 0 || category.targetMinTierLevel != null) && (
              <Badge variant="outline" className="shrink-0">Restricted</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <DocumentList
            documents={category.documents.map((d) => ({
              ...d,
              createdAt: d.createdAt,
            }))}
            canManage={canManage}
          />

          {canManage && (
            <>
              <hr />
              <DocumentUpload categoryId={category.id} />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
