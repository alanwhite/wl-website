"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";
import { canUploadToCategory, getDocumentManagerRoles, canManageDocuments } from "@/lib/config";
import { saveDocument, deleteFile } from "@/lib/upload";

async function requireDocumentManager() {
  const session = await auth();
  if (!session?.user || session.user.status !== "APPROVED") {
    throw new Error("Unauthorized");
  }
  const managerRoles = await getDocumentManagerRoles();
  if (!canManageDocuments(session.user, managerRoles)) {
    throw new Error("Unauthorized: requires document manager role");
  }
  return session.user;
}

async function requireApprovedMember() {
  const session = await auth();
  if (!session?.user || session.user.status !== "APPROVED" || (session.user.tierLevel ?? 0) <= 0) {
    throw new Error("Unauthorized");
  }
  return session.user;
}

// ── Category management (role-gated) ──

export async function createCategory(formData: FormData) {
  const user = await requireDocumentManager();

  const name = (formData.get("name") as string)?.trim();
  const slug = (formData.get("slug") as string)?.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-");
  const description = (formData.get("description") as string)?.trim() || null;
  const sortOrder = parseInt(formData.get("sortOrder") as string) || 0;
  const parentId = (formData.get("parentId") as string) || null;
  const targetRoleSlugs = formData.getAll("targetRoleSlugs") as string[];
  const targetMinTierLevelRaw = formData.get("targetMinTierLevel") as string;
  const targetMinTierLevel = targetMinTierLevelRaw ? parseInt(targetMinTierLevelRaw, 10) : null;
  const uploaderRoleSlugs = formData.getAll("uploaderRoleSlugs") as string[];
  const uploaderMinTierLevelRaw = formData.get("uploaderMinTierLevel") as string;
  const uploaderMinTierLevel = uploaderMinTierLevelRaw ? parseInt(uploaderMinTierLevelRaw, 10) : null;

  if (!name || !slug) throw new Error("Name and slug are required");

  const category = await prisma.libraryCategory.create({
    data: {
      name,
      slug,
      description,
      sortOrder,
      parentId,
      targetRoleSlugs: targetRoleSlugs.filter(Boolean),
      targetMinTierLevel: targetMinTierLevel && !isNaN(targetMinTierLevel) ? targetMinTierLevel : null,
      uploaderRoleSlugs: uploaderRoleSlugs.filter(Boolean),
      uploaderMinTierLevel: uploaderMinTierLevel && !isNaN(uploaderMinTierLevel) ? uploaderMinTierLevel : null,
    },
  });

  await logAudit({
    userId: user.id,
    userName: user.name ?? "Manager",
    action: "library.category.create",
    targetType: "LibraryCategory",
    targetId: category.id,
    details: { name, slug, parentId },
  });

  revalidatePath("/documents");
  return category.id;
}

export async function updateCategory(id: string, formData: FormData) {
  const user = await requireDocumentManager();

  const name = (formData.get("name") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() || null;
  const sortOrder = parseInt(formData.get("sortOrder") as string) || 0;
  const targetRoleSlugs = formData.getAll("targetRoleSlugs") as string[];
  const targetMinTierLevelRaw = formData.get("targetMinTierLevel") as string;
  const targetMinTierLevel = targetMinTierLevelRaw ? parseInt(targetMinTierLevelRaw, 10) : null;
  const uploaderRoleSlugs = formData.getAll("uploaderRoleSlugs") as string[];
  const uploaderMinTierLevelRaw = formData.get("uploaderMinTierLevel") as string;
  const uploaderMinTierLevel = uploaderMinTierLevelRaw ? parseInt(uploaderMinTierLevelRaw, 10) : null;

  if (!name) throw new Error("Name is required");

  await prisma.libraryCategory.update({
    where: { id },
    data: {
      name,
      description,
      sortOrder,
      targetRoleSlugs: targetRoleSlugs.filter(Boolean),
      targetMinTierLevel: targetMinTierLevel && !isNaN(targetMinTierLevel) ? targetMinTierLevel : null,
      uploaderRoleSlugs: uploaderRoleSlugs.filter(Boolean),
      uploaderMinTierLevel: uploaderMinTierLevel && !isNaN(uploaderMinTierLevel) ? uploaderMinTierLevel : null,
    },
  });

  await logAudit({
    userId: user.id,
    userName: user.name ?? "Manager",
    action: "library.category.update",
    targetType: "LibraryCategory",
    targetId: id,
    details: { name },
  });

  revalidatePath("/documents");
}

export async function deleteCategory(id: string) {
  const user = await requireDocumentManager();

  // Get all documents in this category and children (cascade will handle DB but we need file cleanup)
  const category = await prisma.libraryCategory.findUnique({
    where: { id },
    include: {
      documents: { select: { filePath: true } },
      children: {
        include: {
          documents: { select: { filePath: true } },
          children: { include: { documents: { select: { filePath: true } } } },
        },
      },
    },
  });
  if (!category) throw new Error("Category not found");

  // Collect all file paths recursively
  const filePaths: string[] = [];
  function collectFiles(cat: { documents: { filePath: string }[]; children?: any[] }) {
    for (const doc of cat.documents) filePaths.push(doc.filePath);
    for (const child of cat.children ?? []) collectFiles(child);
  }
  collectFiles(category);

  // Delete files from disk
  for (const fp of filePaths) {
    await deleteFile(`/uploads/library/${fp}`).catch(() => {});
  }

  await prisma.libraryCategory.delete({ where: { id } });

  await logAudit({
    userId: user.id,
    userName: user.name ?? "Manager",
    action: "library.category.delete",
    targetType: "LibraryCategory",
    targetId: id,
    details: { name: category.name, documentCount: filePaths.length },
  });

  revalidatePath("/documents");
}

// ── Document management (per-category upload permissions) ──

export async function uploadDocument(categoryId: string, formData: FormData) {
  const user = await requireApprovedMember();

  const category = await prisma.libraryCategory.findUnique({ where: { id: categoryId } });
  if (!category) throw new Error("Category not found");

  if (!canUploadToCategory(user, category)) {
    throw new Error("You don't have permission to upload to this category");
  }

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
  const user = await requireApprovedMember();

  const doc = await prisma.libraryDocument.findUnique({
    where: { id },
    include: { category: true },
  });
  if (!doc) throw new Error("Document not found");

  if (!canUploadToCategory(user, doc.category)) {
    throw new Error("You don't have permission to manage documents in this category");
  }

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
