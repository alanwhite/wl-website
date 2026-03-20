import { prisma } from "@/lib/prisma";
import { MediaGallery } from "@/components/admin/media-gallery";

export const dynamic = "force-dynamic";

export default async function MediaPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = parseInt(params.page ?? "1");
  const pageSize = 24;

  const [items, total] = await Promise.all([
    prisma.media.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.media.count(),
  ]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Media Library</h1>
      <MediaGallery
        items={items}
        currentPage={page}
        totalPages={totalPages}
      />
    </div>
  );
}
