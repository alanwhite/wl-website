import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { FormEditor } from "@/components/forms/form-editor";

export const dynamic = "force-dynamic";

export default async function CreateFormPage() {
  const session = await auth();
  if (!session?.user || !isAdmin(session.user)) redirect("/dashboard");

  const roles = await prisma.role.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, slug: true },
  });

  return (
    <div className="mx-auto max-w-2xl">
      <FormEditor roles={roles} />
    </div>
  );
}
