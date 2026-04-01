import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { canAccessPoll } from "@/lib/config";
import { CategoryCard } from "@/components/library/category-card";

export const dynamic = "force-dynamic";

export default async function DocumentsPage() {
  const session = await auth();
  if (!session?.user || session.user.status !== "APPROVED") redirect("/login");

  const categories = await prisma.libraryCategory.findMany({
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { documents: true } } },
  });

  // Filter categories by access (reuse canAccessPoll — same shape)
  const isAdmin = (session.user.tierLevel ?? 0) >= 999;
  const accessible = isAdmin
    ? categories
    : categories.filter((c) => canAccessPoll(session.user, c));

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Documents</h1>

      {accessible.length === 0 ? (
        <p className="text-muted-foreground">No document categories available.</p>
      ) : (
        <div className="space-y-3">
          {accessible.map((cat) => (
            <CategoryCard
              key={cat.id}
              slug={cat.slug}
              name={cat.name}
              description={cat.description}
              documentCount={cat._count.documents}
            />
          ))}
        </div>
      )}
    </div>
  );
}
