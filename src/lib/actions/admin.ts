"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/auth-helpers";
import { UserStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { sendBrandedEmail } from "@/lib/email";
import { logAudit } from "@/lib/audit";
import { approvalEmailHtml, rejectionEmailHtml } from "@/lib/email-template";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || !isAdmin(session.user)) {
    throw new Error("Unauthorized");
  }
  return session.user;
}

export async function approveRegistration(registrationId: string, tierId?: string) {
  const admin = await requireAdmin();

  // Determine the tier to assign — default to "Member" (level 10)
  let tier;
  if (tierId) {
    tier = await prisma.membershipTier.findUnique({ where: { id: tierId } });
    if (!tier) throw new Error("Tier not found");
  } else {
    tier = await prisma.membershipTier.findFirst({ where: { slug: "member" } });
    if (!tier) throw new Error("Default member tier not found");
  }

  const registration = await prisma.registration.update({
    where: { id: registrationId },
    data: {
      reviewedAt: new Date(),
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

  await logAudit({
    userId: admin.id,
    userName: admin.name ?? "Admin",
    action: "registration.approve",
    targetType: "Registration",
    targetId: registrationId,
    details: { userEmail: registration.user.email, tierName: tier.name },
  });

  revalidatePath("/admin/registrations");
}

export async function rejectRegistration(registrationId: string, reason?: string) {
  const admin = await requireAdmin();

  const registration = await prisma.registration.update({
    where: { id: registrationId },
    data: {
      reviewedAt: new Date(),
      reviewNotes: reason,
      user: {
        update: {
          status: "REJECTED",
        },
      },
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
    userId: admin.id,
    userName: admin.name ?? "Admin",
    action: "registration.reject",
    targetType: "Registration",
    targetId: registrationId,
    details: { userEmail: registration.user.email, reason },
  });

  revalidatePath("/admin/registrations");
}

export async function updateUserTier(userId: string, tierId: string) {
  const admin = await requireAdmin();
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
    userId: admin.id,
    userName: admin.name ?? "Admin",
    action: "user.tier.change",
    targetType: "User",
    targetId: userId,
    details: { newTier: tier.name, userEmail: user.email },
  });

  revalidatePath("/admin/users");
}

export async function assignUserRole(userId: string, roleId: string) {
  const admin = await requireAdmin();

  const [user, role] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, include: { userRoles: true } }),
    prisma.role.findUnique({ where: { id: roleId } }),
  ]);
  if (!user || !role) throw new Error("User or role not found");

  // Check tier eligibility
  if (user.tierLevel < role.minTierLevel) {
    throw new Error(`User's tier level (${user.tierLevel}) is below the required minimum (${role.minTierLevel})`);
  }

  // Check prerequisite role
  if (role.requiredRoleId) {
    const hasPrereq = user.userRoles.some((ur) => ur.roleId === role.requiredRoleId);
    if (!hasPrereq) {
      throw new Error("User does not hold the prerequisite role");
    }
  }

  await prisma.userRole.create({ data: { userId, roleId } });
  await prisma.session.deleteMany({ where: { userId } });

  await logAudit({
    userId: admin.id,
    userName: admin.name ?? "Admin",
    action: "user.role.assign",
    targetType: "User",
    targetId: userId,
    details: { roleName: role.name, userEmail: user.email },
  });

  revalidatePath("/admin/users");
}

export async function removeUserRole(userId: string, roleId: string) {
  const admin = await requireAdmin();

  const role = await prisma.role.findUnique({ where: { id: roleId } });
  if (!role) throw new Error("Role not found");

  // Find roles that depend on this role
  const dependentRoles = await prisma.role.findMany({ where: { requiredRoleId: roleId } });
  const userDependentRoles = await prisma.userRole.findMany({
    where: { userId, roleId: { in: dependentRoles.map((r) => r.id) } },
  });

  // Cascade: remove dependent roles first
  for (const ur of userDependentRoles) {
    await removeUserRole(userId, ur.roleId);
  }

  await prisma.userRole.delete({ where: { userId_roleId: { userId, roleId } } }).catch(() => {});
  await prisma.session.deleteMany({ where: { userId } });

  await logAudit({
    userId: admin.id,
    userName: admin.name ?? "Admin",
    action: "user.role.remove",
    targetType: "User",
    targetId: userId,
    details: { roleName: role.name },
  });

  revalidatePath("/admin/users");
}

export async function updateUserStatus(userId: string, status: UserStatus) {
  const admin = await requireAdmin();
  const user = await prisma.user.update({
    where: { id: userId },
    data: { status },
  });
  if (status === "SUSPENDED") {
    await prisma.session.deleteMany({ where: { userId } });
  }

  await logAudit({
    userId: admin.id,
    userName: admin.name ?? "Admin",
    action: "user.status.change",
    targetType: "User",
    targetId: userId,
    details: { newStatus: status, userEmail: user.email },
  });

  revalidatePath("/admin/users");
}

export async function deleteUser(userId: string) {
  const admin = await requireAdmin();
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
  await prisma.user.delete({ where: { id: userId } });

  await logAudit({
    userId: admin.id,
    userName: admin.name ?? "Admin",
    action: "user.delete",
    targetType: "User",
    targetId: userId,
    details: { userEmail: user?.email },
  });

  revalidatePath("/admin/users");
}
