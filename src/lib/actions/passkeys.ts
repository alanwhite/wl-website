"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");
  return session.user;
}

export async function removePasskey(credentialID: string) {
  const user = await requireUser();

  const authenticator = await prisma.authenticator.findUnique({
    where: { credentialID },
  });

  if (!authenticator || authenticator.userId !== user.id) {
    throw new Error("Passkey not found");
  }

  await prisma.authenticator.delete({
    where: { credentialID },
  });

  await logAudit({
    userId: user.id,
    userName: user.name ?? "Unknown",
    action: "passkey.remove",
    targetType: "Authenticator",
    targetId: credentialID,
  });

  revalidatePath("/profile");
}

export async function dismissPasskeyPrompt() {
  const user = await requireUser();

  const profile = await prisma.userProfile.findUnique({
    where: { userId: user.id },
    select: { extra: true },
  });

  const extra = (profile?.extra as Record<string, unknown>) ?? {};
  extra.passkeyPromptDismissed = true;

  await prisma.userProfile.upsert({
    where: { userId: user.id },
    update: { extra: extra as any },
    create: { userId: user.id, extra: extra as any },
  });

  revalidatePath("/dashboard");
}
