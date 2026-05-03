"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getGroupManagerRoles, canManageGroups } from "@/lib/config";
import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";

async function requireApprovedMember() {
  const session = await auth();
  if (!session?.user || session.user.status !== "APPROVED") {
    throw new Error("Unauthorized");
  }
  return session.user;
}

async function requireGroupManager() {
  const user = await requireApprovedMember();
  const managerRoles = await getGroupManagerRoles();
  if (!canManageGroups(user, managerRoles)) {
    throw new Error("Unauthorized: requires group manager role");
  }
  return user;
}

// ── Manager actions (create/edit/delete groups, assign users) ──

export async function createGroup(data: { name: string; description?: string }) {
  const user = await requireGroupManager();

  const slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const group = await prisma.group.create({
    data: {
      name: data.name.trim(),
      slug,
      description: data.description?.trim() || null,
    },
  });

  await logAudit({
    userId: user.id,
    userName: user.name ?? "Manager",
    action: "group.create",
    targetType: "Group",
    targetId: group.id,
    details: { name: group.name },
  });

  revalidatePath("/admin/groups");
  return group;
}

export async function updateGroup(id: string, data: { name: string; description?: string }) {
  const user = await requireGroupManager();

  const group = await prisma.group.update({
    where: { id },
    data: {
      name: data.name.trim(),
      description: data.description?.trim() || null,
    },
  });

  await logAudit({
    userId: user.id,
    userName: user.name ?? "Manager",
    action: "group.update",
    targetType: "Group",
    targetId: id,
    details: { name: group.name },
  });

  revalidatePath("/admin/groups");
}

export async function deleteGroup(id: string) {
  const user = await requireGroupManager();

  const group = await prisma.group.findUnique({ where: { id }, select: { name: true } });
  await prisma.group.delete({ where: { id } });

  await logAudit({
    userId: user.id,
    userName: user.name ?? "Manager",
    action: "group.delete",
    targetType: "Group",
    targetId: id,
    details: { name: group?.name },
  });

  revalidatePath("/admin/groups");
}

export async function assignUserToGroup(userId: string, groupId: string) {
  const manager = await requireGroupManager();

  const targetUser = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } });
  if (!targetUser) throw new Error("User not found");

  // Connect user to group (many-to-many for access control)
  await prisma.group.update({
    where: { id: groupId },
    data: { members: { connect: { id: userId } } },
  });

  // Auto-create a GroupMember record for their field data (meals etc.)
  const existing = await prisma.groupMember.findFirst({ where: { groupId, userId } });
  if (!existing) {
    await prisma.groupMember.create({
      data: {
        groupId,
        userId,
        name: targetUser.name || targetUser.email || "Unknown",
      },
    });
  }

  await logAudit({
    userId: manager.id,
    userName: manager.name ?? "Manager",
    action: "group.assignUser",
    targetType: "Group",
    targetId: groupId,
    details: { assignedUserId: userId },
  });

  revalidatePath("/members");
  revalidatePath("/admin/groups");
  revalidatePath("/dashboard");
}

export async function removeUserFromGroup(userId: string, groupId: string) {
  const user = await requireGroupManager();

  // Remove the User↔Group relation
  await prisma.group.update({
    where: { id: groupId },
    data: { members: { disconnect: { id: userId } } },
  });

  // Also remove their GroupMember record (meal data etc.)
  await prisma.groupMember.deleteMany({
    where: { groupId, userId },
  });

  await logAudit({
    userId: user.id,
    userName: user.name ?? "Manager",
    action: "group.removeUser",
    targetType: "Group",
    targetId: groupId,
    details: { removedUserId: userId },
  });

  revalidatePath("/members");
  revalidatePath("/admin/groups");
}

// ── Member actions (manage non-user members in own group) ──

export async function addGroupMember(groupId: string, name: string, data?: Record<string, string>) {
  const user = await requireApprovedMember();

  // Verify user belongs to this group
  const group = await prisma.group.findFirst({
    where: { id: groupId, members: { some: { id: user.id } } },
  });
  if (!group) throw new Error("You don't belong to this group");

  const member = await prisma.groupMember.create({
    data: {
      groupId,
      name: name.trim(),
      data: data ?? {},
      addedBy: user.id,
    },
  });

  revalidatePath("/groups");
  return member;
}

export async function updateGroupMember(memberId: string, name: string, data?: Record<string, string>) {
  const user = await requireApprovedMember();

  // Verify member belongs to a group the user is in
  const member = await prisma.groupMember.findUnique({
    where: { id: memberId },
    include: { group: { include: { members: { where: { id: user.id }, select: { id: true } } } } },
  });
  if (!member || member.group.members.length === 0) throw new Error("Unauthorized");

  await prisma.groupMember.update({
    where: { id: memberId },
    data: { name: name.trim(), ...(data ? { data } : {}) },
  });

  revalidatePath("/groups");
}

export async function removeGroupMember(memberId: string) {
  const user = await requireApprovedMember();

  const member = await prisma.groupMember.findUnique({
    where: { id: memberId },
    include: { group: { include: { members: { where: { id: user.id }, select: { id: true } } } } },
  });
  if (!member || member.group.members.length === 0) throw new Error("Unauthorized");

  await prisma.groupMember.delete({ where: { id: memberId } });

  revalidatePath("/groups");
  revalidatePath("/dashboard");
}

export async function setGroupRsvp(groupId: string, status: "attending" | "declined") {
  const user = await requireApprovedMember();

  const group = await prisma.group.findFirst({
    where: { id: groupId, members: { some: { id: user.id } } },
  });
  if (!group) throw new Error("You don't belong to this group");

  await prisma.group.update({
    where: { id: groupId },
    data: {
      rsvpStatus: status,
      confirmedAt: new Date(),
      confirmedBy: user.id,
    },
  });

  revalidatePath("/groups");
  revalidatePath("/dashboard");
}

export async function updateMemberData(
  memberId: string,
  fieldData: Record<string, string>,
) {
  const user = await requireApprovedMember();

  // Verify member belongs to a group the user is in
  const member = await prisma.groupMember.findUnique({
    where: { id: memberId },
    include: { group: { include: { members: { where: { id: user.id }, select: { id: true } } } } },
  });
  if (!member || member.group.members.length === 0) throw new Error("Unauthorized");

  // Merge new field data with existing
  const existingData = (member.data as Record<string, string>) ?? {};
  const merged = { ...existingData, ...fieldData };

  await prisma.groupMember.update({
    where: { id: memberId },
    data: { data: merged },
  });

  revalidatePath("/groups");
  revalidatePath("/dashboard");
}
