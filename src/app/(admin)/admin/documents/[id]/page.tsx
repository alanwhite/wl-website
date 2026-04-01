import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { CategoryForm } from "@/components/admin/category-form";

export const dynamic = "force-dynamic";

export default async function AdminCategoryEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [roles, tiers] = await Promise.all([
    prisma.role.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, slug: true } }),
    prisma.membershipTier.findMany({ where: { isSystem: false }, orderBy: { level: "asc" }, select: { id: true, name: true, level: true } }),
  ]);

  if (id === "new") {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">New Category</h1>
        <CategoryForm roles={roles} tiers={tiers} />
      </div>
    );
  }

  const category = await prisma.libraryCategory.findUnique({ where: { id } });
  if (!category) notFound();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Edit Category</h1>
      <CategoryForm category={category} roles={roles} tiers={tiers} />
    </div>
  );
}
