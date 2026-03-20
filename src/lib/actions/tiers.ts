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

export async function getTiers() {
  return prisma.membershipTier.findMany({ orderBy: { level: "asc" } });
}

export async function createTier(data: { name: string; slug: string; level: number; description?: string }) {
  const admin = await requireAdmin();
  const tier = await prisma.membershipTier.create({ data });

  await logAudit({
    userId: admin.id,
    userName: admin.name ?? "Admin",
    action: "tier.create",
    targetType: "MembershipTier",
    targetId: tier.id,
    details: { name: tier.name, level: tier.level },
  });

  revalidatePath("/admin/tiers");
  return tier;
}

export async function updateTier(id: string, data: { name: string; slug: string; level: number; description?: string }) {
  const admin = await requireAdmin();
  const tier = await prisma.membershipTier.findUnique({ where: { id } });
  if (!tier) throw new Error("Tier not found");
  if (tier.isSystem) throw new Error("Cannot modify system tiers");

  const updated = await prisma.membershipTier.update({ where: { id }, data });

  // Update denormalized fields on users with this tier
  await prisma.user.updateMany({
    where: { tierId: id },
    data: { tierLevel: data.level, tierName: data.name },
  });

  await logAudit({
    userId: admin.id,
    userName: admin.name ?? "Admin",
    action: "tier.update",
    targetType: "MembershipTier",
    targetId: id,
    details: { name: data.name, level: data.level },
  });

  revalidatePath("/admin/tiers");
  return updated;
}

export async function deleteTier(id: string) {
  const admin = await requireAdmin();
  const tier = await prisma.membershipTier.findUnique({ where: { id } });
  if (!tier) throw new Error("Tier not found");
  if (tier.isSystem) throw new Error("Cannot delete system tiers");

  const userCount = await prisma.user.count({ where: { tierId: id } });
  if (userCount > 0) throw new Error(`Cannot delete tier with ${userCount} assigned user(s)`);

  await prisma.membershipTier.delete({ where: { id } });

  await logAudit({
    userId: admin.id,
    userName: admin.name ?? "Admin",
    action: "tier.delete",
    targetType: "MembershipTier",
    targetId: id,
    details: { name: tier.name },
  });

  revalidatePath("/admin/tiers");
}
