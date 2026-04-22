import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { CategoryForm } from "@/components/admin/category-form";

export const dynamic = "force-dynamic";

export default async function AdminCategoryEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ parentId?: string }>;
}) {
  const { id } = await params;
  const { parentId } = await searchParams;

  const [roles, tiers] = await Promise.all([
    prisma.role.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, slug: true } }),
    prisma.membershipTier.findMany({ where: { isSystem: false }, orderBy: { level: "asc" }, select: { id: true, name: true, level: true } }),
  ]);

  if (id === "new") {
    // Get parent name for display
    let parentName: string | null = null;
    if (parentId) {
      const parent = await prisma.libraryCategory.findUnique({
        where: { id: parentId },
        select: { name: true },
      });
      parentName = parent?.name ?? null;
    }

    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">
          {parentName ? `New Sub-folder in ${parentName}` : "New Category"}
        </h1>
        <CategoryForm roles={roles} tiers={tiers} parentId={parentId} />
      </div>
    );
  }

  const category = await prisma.libraryCategory.findUnique({ where: { id } });
  if (!category) notFound();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Edit Category</h1>
      <CategoryForm category={category} roles={roles} tiers={tiers} />
    </div>
  );
}
