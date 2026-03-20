"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/auth-helpers";
import { saveFile, deleteFile } from "@/lib/upload";
import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || !isAdmin(session.user)) {
    throw new Error("Unauthorized");
  }
  return session.user;
}

export async function uploadMedia(formData: FormData) {
  const admin = await requireAdmin();
  const file = formData.get("file") as File | null;
  const altText = formData.get("altText") as string | null;

  if (!file || file.size === 0) throw new Error("No file provided");

  const filePath = await saveFile(file, "media");

  const media = await prisma.media.create({
    data: {
      fileName: file.name,
      fileType: file.type,
      filePath,
      fileSize: file.size,
      altText: altText || null,
      uploadedBy: admin.id,
    },
  });

  await logAudit({
    userId: admin.id,
    userName: admin.name ?? "Admin",
    action: "media.upload",
    targetType: "Media",
    targetId: media.id,
    details: { fileName: file.name },
  });

  revalidatePath("/admin/media");
  return media;
}

export async function deleteMedia(id: string) {
  const admin = await requireAdmin();
  const media = await prisma.media.findUnique({ where: { id } });
  if (!media) throw new Error("Media not found");

  await deleteFile(media.filePath).catch(() => {});
  await prisma.media.delete({ where: { id } });

  await logAudit({
    userId: admin.id,
    userName: admin.name ?? "Admin",
    action: "media.delete",
    targetType: "Media",
    targetId: id,
    details: { fileName: media.fileName },
  });

  revalidatePath("/admin/media");
}

export async function listMedia(page: number = 1, limit: number = 24) {
  const session = await auth();
  if (!session?.user || !isAdmin(session.user)) {
    throw new Error("Unauthorized");
  }

  const [items, total] = await Promise.all([
    prisma.media.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.media.count(),
  ]);

  return { items, total, totalPages: Math.ceil(total / limit) };
}
