import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { isAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { FormEditor } from "@/components/forms/form-editor";

export const dynamic = "force-dynamic";

export default async function EditFormPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user || !isAdmin(session.user)) redirect("/dashboard");

  const { id } = await params;
  const form = await prisma.publicForm.findUnique({ where: { id } });
  if (!form) notFound();

  const roles = await prisma.role.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, slug: true },
  });

  return (
    <div className="mx-auto max-w-2xl">
      <FormEditor roles={roles} form={form} />
    </div>
  );
}
