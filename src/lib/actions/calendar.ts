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

  const startDate = new Date(data.startDate);
  let endDate = new Date(data.endDate || data.startDate);
  // Ensure end is after start — default to start + 1 hour
  if (endDate <= startDate) {
    endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
  }

  const event = await prisma.calendarEvent.create({
    data: {
      title: data.title,
      description: data.description || null,
      location: data.location || null,
      startDate,
      endDate,
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

  const updateStart = new Date(data.startDate);
  let updateEnd = new Date(data.endDate || data.startDate);
  if (updateEnd <= updateStart) {
    updateEnd = new Date(updateStart.getTime() + 60 * 60 * 1000);
  }

  const event = await prisma.calendarEvent.update({
    where: { id: eventId },
    data: {
      title: data.title,
      description: data.description || null,
      location: data.location || null,
      startDate: updateStart,
      endDate: updateEnd,
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

export async function rsvpEvent(eventId: string, status: "accepted" | "declined" | "maybe") {
  const session = await auth();
  if (!session?.user || session.user.status !== "APPROVED") {
    throw new Error("Unauthorized");
  }

  await prisma.eventRsvp.upsert({
    where: { eventId_userId: { eventId, userId: session.user.id } },
    update: { status },
    create: { eventId, userId: session.user.id, status },
  });

  revalidatePath(`/calendar/${eventId}`);
}

export async function removeRsvp(eventId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  await prisma.eventRsvp.delete({
    where: { eventId_userId: { eventId, userId: session.user.id } },
  }).catch(() => {});

  revalidatePath(`/calendar/${eventId}`);
}
