"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";

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

const ONBOARDING_STEPS = ["passkey", "pwa", "notifications"] as const;
type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

const DISMISS_KEY: Record<OnboardingStep, string> = {
  passkey: "passkeyPromptDismissed",
  pwa: "pwaPromptDismissed",
  notifications: "notificationsPromptDismissed",
};

export async function dismissOnboardingStep(step: OnboardingStep) {
  if (!ONBOARDING_STEPS.includes(step)) throw new Error("Unknown onboarding step");
  const user = await requireUser();

  const profile = await prisma.userProfile.findUnique({
    where: { userId: user.id },
    select: { extra: true },
  });

  const extra = (profile?.extra as Record<string, unknown>) ?? {};
  extra[DISMISS_KEY[step]] = true;
  const extraValue = extra as Prisma.InputJsonValue;

  await prisma.userProfile.upsert({
    where: { userId: user.id },
    update: { extra: extraValue },
    create: { userId: user.id, extra: extraValue },
  });

  revalidatePath("/dashboard");
}

