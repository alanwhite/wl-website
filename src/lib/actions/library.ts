"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/auth-helpers";
import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";
import { getLibraryManagerRoles, canManageLibrary } from "@/lib/config";
import { saveDocument, deleteFile } from "@/lib/upload";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || !isAdmin(session.user)) {
    throw new Error("Unauthorized");
  }
  return session.user;
}

async function requireLibraryManager() {
  const session = await auth();
  if (!session?.user || session.user.status !== "APPROVED") {
    throw new Error("Unauthorized");
  }
  const managerRoles = await getLibraryManagerRoles();
  if (!canManageLibrary(session.user, managerRoles)) {
    throw new Error("Unauthorized: requires library manager role");
  }
  return session.user;
}

// ── Category management (admin only) ──────────────────────────────────────

export async function createCategory(formData: FormData) {
  const admin = await requireAdmin();

  const name = (formData.get("name") as string)?.trim();
  const slug = (formData.get("slug") as string)?.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-");
  const description = (formData.get("description") as string)?.trim() || null;
  const sortOrder = parseInt(formData.get("sortOrder") as string) || 0;
  const targetRoleSlugs = formData.getAll("targetRoleSlugs") as string[];
  const targetMinTierLevelRaw = formData.get("targetMinTierLevel") as string;
  const targetMinTierLevel = targetMinTierLevelRaw ? parseInt(targetMinTierLevelRaw, 10) : null;

  if (!name || !slug) throw new Error("Name and slug are required");

  const category = await prisma.libraryCategory.create({
    data: {
      name,
      slug,
      description,
      sortOrder,
      targetRoleSlugs: targetRoleSlugs.filter(Boolean),
      targetMinTierLevel: targetMinTierLevel && !isNaN(targetMinTierLevel) ? targetMinTierLevel : null,
    },
  });

  await logAudit({
    userId: admin.id,
    userName: admin.name ?? "Admin",
    action: "library.category.create",
    targetType: "LibraryCategory",
    targetId: category.id,
    details: { name, slug },
  });

  revalidatePath("/documents");
  return category.id;
}

export async function updateCategory(id: string, formData: FormData) {
  const admin = await requireAdmin();

  const name = (formData.get("name") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() || null;
  const sortOrder = parseInt(formData.get("sortOrder") as string) || 0;
  const targetRoleSlugs = formData.getAll("targetRoleSlugs") as string[];
  const targetMinTierLevelRaw = formData.get("targetMinTierLevel") as string;
  const targetMinTierLevel = targetMinTierLevelRaw ? parseInt(targetMinTierLevelRaw, 10) : null;

  if (!name) throw new Error("Name is required");

  await prisma.libraryCategory.update({
    where: { id },
    data: {
      name,
      description,
      sortOrder,
      targetRoleSlugs: targetRoleSlugs.filter(Boolean),
      targetMinTierLevel: targetMinTierLevel && !isNaN(targetMinTierLevel) ? targetMinTierLevel : null,
    },
  });

  await logAudit({
    userId: admin.id,
    userName: admin.name ?? "Admin",
    action: "library.category.update",
    targetType: "LibraryCategory",
    targetId: id,
    details: { name },
  });

  revalidatePath("/documents");
}

export async function deleteCategory(id: string) {
  const admin = await requireAdmin();

  const category = await prisma.libraryCategory.findUnique({
    where: { id },
    include: { documents: { select: { filePath: true } } },
  });
  if (!category) throw new Error("Category not found");

  // Delete files from disk
  for (const doc of category.documents) {
    await deleteFile(`/uploads/library/${doc.filePath}`).catch(() => {});
  }

  await prisma.libraryCategory.delete({ where: { id } });

  await logAudit({
    userId: admin.id,
    userName: admin.name ?? "Admin",
    action: "library.category.delete",
    targetType: "LibraryCategory",
    targetId: id,
    details: { name: category.name, documentCount: category.documents.length },
  });

  revalidatePath("/documents");
}

// ── Document management (library managers) ────────────────────────────────

export async function uploadDocument(categoryId: string, formData: FormData) {
  const user = await requireLibraryManager();

  const category = await prisma.libraryCategory.findUnique({ where: { id: categoryId } });
  if (!category) throw new Error("Category not found");

  const title = (formData.get("title") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() || null;
  const file = formData.get("file") as File | null;

  if (!title) throw new Error("Title is required");
  if (!file || file.size === 0) throw new Error("File is required");

  const saved = await saveDocument(file, "library");

  await prisma.libraryDocument.create({
    data: {
      categoryId,
      title,
      description,
      fileName: saved.fileName,
      fileType: saved.fileType,
      filePath: saved.url.replace("/uploads/library/", ""),
      fileSize: saved.fileSize,
      uploadedBy: user.id,
    },
  });

  await logAudit({
    userId: user.id,
    userName: user.name ?? "Unknown",
    action: "library.document.upload",
    targetType: "LibraryDocument",
    details: { title, category: category.name, fileName: saved.fileName },
  });

  revalidatePath(`/documents/${category.slug}`);
}

export async function deleteDocument(id: string) {
  const user = await requireLibraryManager();

  const doc = await prisma.libraryDocument.findUnique({
    where: { id },
    include: { category: { select: { slug: true, name: true } } },
  });
  if (!doc) throw new Error("Document not found");

  await deleteFile(`/uploads/library/${doc.filePath}`).catch(() => {});
  await prisma.libraryDocument.delete({ where: { id } });

  await logAudit({
    userId: user.id,
    userName: user.name ?? "Unknown",
    action: "library.document.delete",
    targetType: "LibraryDocument",
    targetId: id,
    details: { title: doc.title, category: doc.category.name },
  });

  revalidatePath(`/documents/${doc.category.slug}`);
}
