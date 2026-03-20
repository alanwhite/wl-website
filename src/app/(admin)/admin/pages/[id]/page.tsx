import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { PageEditor } from "@/components/admin/page-editor";

export const dynamic = "force-dynamic";

export default async function EditPagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (id === "new") {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <h1 className="text-3xl font-bold">New Page</h1>
        <PageEditor />
      </div>
    );
  }

  const page = await prisma.page.findUnique({ where: { id } });
  if (!page) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-3xl font-bold">Edit Page</h1>
      <PageEditor page={page} />
    </div>
  );
}
