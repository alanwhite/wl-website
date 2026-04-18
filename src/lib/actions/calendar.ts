"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getCalendarManagerRoles, canManageCalendar } from "@/lib/config";
import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";

async function requireApprovedMember() {
  const session = await auth();
  if (!session?.user || session.user.status !== "APPROVED") {
    throw new Error("Unauthorized");
  }
  return session.user;
}

async function requireCalendarManager() {
  const user = await requireApprovedMember();
  const managerRoles = await getCalendarManagerRoles();
  if (!canManageCalendar(user, managerRoles)) {
    throw new Error("Unauthorized: requires calendar manager role");
  }
  return user;
}

export async function createEvent(data: {
  title: string;
  description?: string;
  location?: string;
  startDate: string;
  endDate: string;
  allDay: boolean;
  recurrence?: string;
  recurrenceEnd?: string;
  targetRoleSlugs?: string[];
  targetMinTierLevel?: number;
}) {
  const user = await requireCalendarManager();

  const event = await prisma.calendarEvent.create({
    data: {
      title: data.title,
      description: data.description || null,
      location: data.location || null,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      allDay: data.allDay,
      recurrence: data.recurrence || null,
      recurrenceEnd: data.recurrenceEnd ? new Date(data.recurrenceEnd) : null,
      targetRoleSlugs: data.targetRoleSlugs ?? [],
      targetMinTierLevel: data.targetMinTierLevel ?? null,
      createdBy: user.id,
    },
  });

  await logAudit({
    userId: user.id,
    userName: user.name ?? "Manager",
    action: "calendar.event.create",
    targetType: "CalendarEvent",
    targetId: event.id,
    details: { title: data.title },
  });

  revalidatePath("/calendar");
  return event;
}

export async function updateEvent(
  eventId: string,
  data: {
    title: string;
    description?: string;
    location?: string;
    startDate: string;
    endDate: string;
    allDay: boolean;
    recurrence?: string;
    recurrenceEnd?: string;
    targetRoleSlugs?: string[];
    targetMinTierLevel?: number;
  },
) {
  const user = await requireCalendarManager();

  const event = await prisma.calendarEvent.update({
    where: { id: eventId },
    data: {
      title: data.title,
      description: data.description || null,
      location: data.location || null,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      allDay: data.allDay,
      recurrence: data.recurrence || null,
      recurrenceEnd: data.recurrenceEnd ? new Date(data.recurrenceEnd) : null,
      targetRoleSlugs: data.targetRoleSlugs ?? [],
      targetMinTierLevel: data.targetMinTierLevel ?? null,
    },
  });

  await logAudit({
    userId: user.id,
    userName: user.name ?? "Manager",
    action: "calendar.event.update",
    targetType: "CalendarEvent",
    targetId: eventId,
    details: { title: data.title },
  });

  revalidatePath("/calendar");
  return event;
}

export async function deleteEvent(eventId: string) {
  const user = await requireCalendarManager();

  const event = await prisma.calendarEvent.findUnique({
    where: { id: eventId },
    select: { title: true },
  });

  await prisma.calendarEvent.delete({ where: { id: eventId } });

  await logAudit({
    userId: user.id,
    userName: user.name ?? "Manager",
    action: "calendar.event.delete",
    targetType: "CalendarEvent",
    targetId: eventId,
    details: { title: event?.title },
  });

  revalidatePath("/calendar");
}
