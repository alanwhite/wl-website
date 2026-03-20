"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/auth-helpers";
import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || !isAdmin(session.user)) {
    throw new Error("Unauthorized");
  }
  return session.user;
}

export async function getRoles() {
  return prisma.role.findMany({
    orderBy: { name: "asc" },
    include: { requiredRole: { select: { id: true, name: true } } },
  });
}

export async function createRole(data: { name: string; slug: string; description?: string; minTierLevel: number; requiredRoleId?: string | null }) {
  const admin = await requireAdmin();
  const role = await prisma.role.create({
    data: {
      name: data.name,
      slug: data.slug,
      description: data.description,
      minTierLevel: data.minTierLevel,
      requiredRoleId: data.requiredRoleId || null,
    },
  });

  await logAudit({
    userId: admin.id,
    userName: admin.name ?? "Admin",
    action: "role.create",
    targetType: "Role",
    targetId: role.id,
    details: { name: role.name, minTierLevel: role.minTierLevel },
  });

  revalidatePath("/admin/roles");
  return role;
}

export async function updateRole(id: string, data: { name: string; slug: string; description?: string; minTierLevel: number; requiredRoleId?: string | null }) {
  const admin = await requireAdmin();
  const role = await prisma.role.update({
    where: { id },
    data: {
      name: data.name,
      slug: data.slug,
      description: data.description,
      minTierLevel: data.minTierLevel,
      requiredRoleId: data.requiredRoleId || null,
    },
  });

  await logAudit({
    userId: admin.id,
    userName: admin.name ?? "Admin",
    action: "role.update",
    targetType: "Role",
    targetId: id,
    details: { name: data.name },
  });

  revalidatePath("/admin/roles");
  return role;
}

export async function deleteRole(id: string) {
  const admin = await requireAdmin();
  const role = await prisma.role.findUnique({ where: { id } });
  if (!role) throw new Error("Role not found");

  // Check if any users hold this role
  const userCount = await prisma.userRole.count({ where: { roleId: id } });
  if (userCount > 0) throw new Error(`Cannot delete role with ${userCount} assigned user(s)`);

  // Check if other roles depend on this one
  const dependentCount = await prisma.role.count({ where: { requiredRoleId: id } });
  if (dependentCount > 0) throw new Error(`Cannot delete role — ${dependentCount} other role(s) require it`);

  await prisma.role.delete({ where: { id } });

  await logAudit({
    userId: admin.id,
    userName: admin.name ?? "Admin",
    action: "role.delete",
    targetType: "Role",
    targetId: id,
    details: { name: role.name },
  });

  revalidatePath("/admin/roles");
}
