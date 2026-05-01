"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/auth-helpers";
import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";
import { z } from "zod";
import { sendPushNotifications } from "@/lib/push";

const announcementSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
  published: z.boolean(),
  pinned: z.boolean(),
  expiresAt: z.string().nullable().transform((val) => (val ? new Date(val) : null)),
});

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || !isAdmin(session.user)) {
    throw new Error("Unauthorized");
  }
  return session.user;
}

export async function createAnnouncement(data: z.input<typeof announcementSchema>) {
  const admin = await requireAdmin();
  const validated = announcementSchema.parse(data);

  const announcement = await prisma.announcement.create({
    data: {
      ...validated,
      createdBy: admin.id,
    },
  });

  await logAudit({
    userId: admin.id,
    userName: admin.name ?? "Admin",
    action: "announcement.create",
    targetType: "Announcement",
    targetId: announcement.id,
    details: { title: announcement.title },
  });

  if (validated.published) {
    sendPushNotifications({
      type: "announcements",
      title: announcement.title,
      body: `New announcement: ${announcement.title}`,
      url: "/announcements",
      tag: `announcement-${announcement.id}`,
      excludeUserId: admin.id,
    }).catch((err) => console.error("[Push] Failed to send announcement notifications:", err));
  }

  revalidatePath("/admin/announcements");
  revalidatePath("/dashboard");
  return announcement;
}

export async function updateAnnouncement(id: string, data: z.input<typeof announcementSchema>) {
  const admin = await requireAdmin();
  const validated = announcementSchema.parse(data);

  const announcement = await prisma.announcement.update({
    where: { id },
    data: validated,
  });

  await logAudit({
    userId: admin.id,
    userName: admin.name ?? "Admin",
    action: "announcement.update",
    targetType: "Announcement",
    targetId: id,
    details: { title: announcement.title },
  });

  revalidatePath("/admin/announcements");
  revalidatePath("/dashboard");
  return announcement;
}

export async function deleteAnnouncement(id: string) {
  const admin = await requireAdmin();
  const announcement = await prisma.announcement.delete({ where: { id } });

  await logAudit({
    userId: admin.id,
    userName: admin.name ?? "Admin",
    action: "announcement.delete",
    targetType: "Announcement",
    targetId: id,
    details: { title: announcement.title },
  });

  revalidatePath("/admin/announcements");
  revalidatePath("/dashboard");
}

export async function getActiveAnnouncements() {
  return prisma.announcement.findMany({
    where: {
      published: true,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ],
    },
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
  });
}
