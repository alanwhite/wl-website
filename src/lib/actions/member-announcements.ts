"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getAnnouncementManagerRoles, canManageAnnouncements } from "@/lib/config";
import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

const announcementSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
  published: z.boolean(),
  pinned: z.boolean(),
  expiresAt: z.string().nullable().transform((val) => (val ? new Date(val) : null)),
});

async function requireAnnouncementManager() {
  const session = await auth();
  if (!session?.user || session.user.status !== "APPROVED") {
    throw new Error("Unauthorized");
  }
  const managerRoles = await getAnnouncementManagerRoles();
  if (!canManageAnnouncements(session.user, managerRoles)) {
    throw new Error("Unauthorized: requires announcement manager role");
  }
  return session.user;
}

export async function createAnnouncement(data: z.input<typeof announcementSchema>) {
  const user = await requireAnnouncementManager();
  const validated = announcementSchema.parse(data);

  const announcement = await prisma.announcement.create({
    data: { ...validated, createdBy: user.id },
  });

  await logAudit({
    userId: user.id,
    userName: user.name ?? "Manager",
    action: "announcement.create",
    targetType: "Announcement",
    targetId: announcement.id,
    details: { title: announcement.title },
  });

  revalidatePath("/announcements");
  revalidatePath("/dashboard");
  return announcement;
}

export async function updateAnnouncement(id: string, data: z.input<typeof announcementSchema>) {
  const user = await requireAnnouncementManager();
  const validated = announcementSchema.parse(data);

  const announcement = await prisma.announcement.update({
    where: { id },
    data: validated,
  });

  await logAudit({
    userId: user.id,
    userName: user.name ?? "Manager",
    action: "announcement.update",
    targetType: "Announcement",
    targetId: id,
    details: { title: announcement.title },
  });

  revalidatePath("/announcements");
  revalidatePath("/dashboard");
  return announcement;
}

export async function deleteAnnouncement(id: string) {
  const user = await requireAnnouncementManager();
  const announcement = await prisma.announcement.delete({ where: { id } });

  await logAudit({
    userId: user.id,
    userName: user.name ?? "Manager",
    action: "announcement.delete",
    targetType: "Announcement",
    targetId: id,
    details: { title: announcement.title },
  });

  revalidatePath("/announcements");
  revalidatePath("/dashboard");
}
