"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/auth-helpers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { logAudit } from "@/lib/audit";

const pageSchema = z.object({
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
  title: z.string().min(1, "Title is required"),
  content: z.string(),
  published: z.boolean(),
  sortOrder: z.number().int(),
});

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || !isAdmin(session.user)) {
    throw new Error("Unauthorized");
  }
  return session.user;
}

export async function createPage(data: z.infer<typeof pageSchema>) {
  const admin = await requireAdmin();
  const validated = pageSchema.parse(data);
  const page = await prisma.page.create({ data: validated });

  await logAudit({
    userId: admin.id,
    userName: admin.name ?? "Admin",
    action: "page.create",
    targetType: "Page",
    targetId: page.id,
    details: { slug: page.slug, title: page.title },
  });

  revalidatePath("/admin/pages");
  revalidatePath(`/p/${page.slug}`);
  return page;
}

export async function updatePage(id: string, data: z.infer<typeof pageSchema>) {
  const admin = await requireAdmin();
  const validated = pageSchema.parse(data);
  const page = await prisma.page.update({ where: { id }, data: validated });

  await logAudit({
    userId: admin.id,
    userName: admin.name ?? "Admin",
    action: "page.update",
    targetType: "Page",
    targetId: page.id,
    details: { slug: page.slug, title: page.title },
  });

  revalidatePath("/admin/pages");
  revalidatePath(`/p/${page.slug}`);
  return page;
}

export async function deletePage(id: string) {
  const admin = await requireAdmin();
  const page = await prisma.page.delete({ where: { id } });

  await logAudit({
    userId: admin.id,
    userName: admin.name ?? "Admin",
    action: "page.delete",
    targetType: "Page",
    targetId: id,
    details: { slug: page.slug, title: page.title },
  });

  revalidatePath("/admin/pages");
  revalidatePath(`/p/${page.slug}`);
  redirect("/admin/pages");
}
