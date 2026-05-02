"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getMemberManagerRoles, canManageMembers } from "@/lib/config";
import { UserStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { sendBrandedEmail } from "@/lib/email";
import { logAudit } from "@/lib/audit";
import { approvalEmailHtml, rejectionEmailHtml } from "@/lib/email-template";

async function requireMemberManager() {
  const session = await auth();
  if (!session?.user || session.user.status !== "APPROVED") {
    throw new Error("Unauthorized");
  }
  const managerRoles = await getMemberManagerRoles();
  if (!canManageMembers(session.user, managerRoles)) {
    throw new Error("Unauthorized: requires member manager role");
  }
  return session.user;
}

export async function approveRegistration(registrationId: string, tierId?: string, groupId?: string) {
  const manager = await requireMemberManager();

  let tier;
  if (tierId) {
    tier = await prisma.membershipTier.findUnique({ where: { id: tierId } });
    if (!tier) throw new Error("Tier not found");
  } else {
    const registration = await prisma.registration.findUnique({
      where: { id: registrationId },
      select: { suggestedTierId: true },
    });
    if (registration?.suggestedTierId) {
      tier = await prisma.membershipTier.findUnique({ where: { id: registration.suggestedTierId } });
    }
    if (!tier) {
      tier = await prisma.membershipTier.findFirst({ where: { isSystem: false }, orderBy: { level: "asc" } });
    }
    if (!tier) throw new Error("No membership tier available");
  }

  const registration = await prisma.registration.update({
    where: { id: registrationId },
    data: {
      reviewedAt: new Date(),
      reviewedBy: manager.id,
      user: {
        update: {
          tierId: tier.id,
          tierLevel: tier.level,
          tierName: tier.name,
          status: "APPROVED",
        },
      },
    },
    include: { user: true },
  });

  if (registration.user.email) {
    await sendBrandedEmail({
      to: registration.user.email,
      subject: "Registration Approved",
      bodyHtml: approvalEmailHtml(`${process.env.AUTH_URL}/dashboard`),
    }).catch(console.error);
  }

  // Assign to group if specified
  if (groupId) {
    await prisma.group.update({
      where: { id: groupId },
      data: { members: { connect: { id: registration.user.id } } },
    }).catch(() => {});

    // Auto-create GroupMember record for field data (meals etc.)
    const existingMember = await prisma.groupMember.findFirst({
      where: { groupId, userId: registration.user.id },
    });
    if (!existingMember) {
      await prisma.groupMember.create({
        data: {
          groupId,
          userId: registration.user.id,
          name: registration.user.name || registration.user.email || "Unknown",
        },
      }).catch(() => {});
    }
  }

  await logAudit({
    userId: manager.id,
    userName: manager.name ?? "Manager",
    action: "registration.approve",
    targetType: "Registration",
    targetId: registrationId,
    details: { userEmail: registration.user.email, tierName: tier.name, groupId },
  });

  revalidatePath("/members/registrations");
}

export async function rejectRegistration(registrationId: string, reason?: string) {
  const manager = await requireMemberManager();

  const registration = await prisma.registration.update({
    where: { id: registrationId },
    data: {
      reviewedAt: new Date(),
      reviewedBy: manager.id,
      reviewNotes: reason,
      user: { update: { status: "REJECTED" } },
    },
    include: { user: true },
  });

  if (registration.user.email) {
    await sendBrandedEmail({
      to: registration.user.email,
      subject: "Registration Update",
      bodyHtml: rejectionEmailHtml(reason),
    }).catch(console.error);
  }

  await logAudit({
    userId: manager.id,
    userName: manager.name ?? "Manager",
    action: "registration.reject",
    targetType: "Registration",
    targetId: registrationId,
    details: { userEmail: registration.user.email, reason },
  });

  revalidatePath("/members/registrations");
}

export async function updateUserTier(userId: string, tierId: string) {
  const manager = await requireMemberManager();
  const tier = await prisma.membershipTier.findUnique({ where: { id: tierId } });
  if (!tier) throw new Error("Tier not found");

  const user = await prisma.user.update({
    where: { id: userId },
    data: { tierId: tier.id, tierLevel: tier.level, tierName: tier.name },
    include: { userRoles: { include: { role: true } } },
  });

  // Remove roles the user no longer qualifies for
  const ineligibleRoles = user.userRoles.filter((ur) => ur.role.minTierLevel > tier.level);
  for (const ur of ineligibleRoles) {
    await removeUserRole(userId, ur.roleId);
  }

  await prisma.session.deleteMany({ where: { userId } });

  await logAudit({
    userId: manager.id,
    userName: manager.name ?? "Manager",
    action: "user.tier.change",
    targetType: "User",
    targetId: userId,
    details: { newTier: tier.name, userEmail: user.email },
  });

  revalidatePath("/members");
}

export async function assignUserRole(userId: string, roleId: string) {
  const manager = await requireMemberManager();

  const [user, role] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, include: { userRoles: true } }),
    prisma.role.findUnique({ where: { id: roleId } }),
  ]);
  if (!user || !role) throw new Error("User or role not found");

  if (user.tierLevel < role.minTierLevel) {
    throw new Error(`User's tier level (${user.tierLevel}) is below the required minimum (${role.minTierLevel})`);
  }

  if (role.requiredRoleId) {
    const hasPrereq = user.userRoles.some((ur) => ur.roleId === role.requiredRoleId);
    if (!hasPrereq) throw new Error("User does not hold the prerequisite role");
  }

  await prisma.userRole.create({ data: { userId, roleId } });
  await prisma.session.deleteMany({ where: { userId } });

  await logAudit({
    userId: manager.id,
    userName: manager.name ?? "Manager",
    action: "user.role.assign",
    targetType: "User",
    targetId: userId,
    details: { roleName: role.name, userEmail: user.email },
  });

  revalidatePath("/members");
}

export async function removeUserRole(userId: string, roleId: string) {
  const manager = await requireMemberManager();

  const role = await prisma.role.findUnique({ where: { id: roleId } });
  if (!role) throw new Error("Role not found");

  const dependentRoles = await prisma.role.findMany({ where: { requiredRoleId: roleId } });
  const userDependentRoles = await prisma.userRole.findMany({
    where: { userId, roleId: { in: dependentRoles.map((r) => r.id) } },
  });

  for (const ur of userDependentRoles) {
    await removeUserRole(userId, ur.roleId);
  }

  await prisma.userRole.delete({ where: { userId_roleId: { userId, roleId } } }).catch(() => {});
  await prisma.session.deleteMany({ where: { userId } });

  await logAudit({
    userId: manager.id,
    userName: manager.name ?? "Manager",
    action: "user.role.remove",
    targetType: "User",
    targetId: userId,
    details: { roleName: role.name },
  });

  revalidatePath("/members");
}

export async function updateUserStatus(userId: string, status: UserStatus) {
  const manager = await requireMemberManager();
  const user = await prisma.user.update({
    where: { id: userId },
    data: { status },
  });
  if (status === "SUSPENDED") {
    await prisma.session.deleteMany({ where: { userId } });
  }

  await logAudit({
    userId: manager.id,
    userName: manager.name ?? "Manager",
    action: "user.status.change",
    targetType: "User",
    targetId: userId,
    details: { newStatus: status, userEmail: user.email },
  });

  revalidatePath("/members");
}

export async function deleteUser(userId: string) {
  const manager = await requireMemberManager();
  if (userId === manager.id) throw new Error("You cannot delete your own account");
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, tierLevel: true } });
  if (user?.tierLevel && user.tierLevel >= 999) throw new Error("Cannot delete an admin account");
  await prisma.user.delete({ where: { id: userId } });

  await logAudit({
    userId: manager.id,
    userName: manager.name ?? "Manager",
    action: "user.delete",
    targetType: "User",
    targetId: userId,
    details: { userEmail: user?.email },
  });

  revalidatePath("/members");
}
