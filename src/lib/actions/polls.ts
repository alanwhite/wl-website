"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";
import { getPollManagerRoles, canManagePolls, canAccessPoll } from "@/lib/config";

async function requireApprovedMember() {
  const session = await auth();
  if (!session?.user || session.user.status !== "APPROVED" || session.user.tierLevel <= 0) {
    throw new Error("Unauthorized");
  }
  return session.user;
}

async function requirePollManager() {
  const user = await requireApprovedMember();
  const managerRoles = await getPollManagerRoles();
  if (!canManagePolls(user, managerRoles)) {
    throw new Error("Unauthorized: requires poll manager role");
  }
  return user;
}

export async function createPoll(formData: FormData) {
  const user = await requirePollManager();

  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const isAnonymous = formData.get("isAnonymous") === "on";
  const optionsRaw = formData.getAll("options") as string[];
  const targetRoleSlugs = formData.getAll("targetRoleSlugs") as string[];
  const targetMinTierLevelRaw = formData.get("targetMinTierLevel") as string;
  const targetMinTierLevel = targetMinTierLevelRaw ? parseInt(targetMinTierLevelRaw, 10) : null;

  if (!title?.trim()) throw new Error("Title is required");

  const options = optionsRaw.filter((o) => o.trim());
  if (options.length < 2) throw new Error("At least 2 options are required");

  const poll = await prisma.poll.create({
    data: {
      title: title.trim(),
      description: description?.trim() || null,
      isAnonymous,
      targetRoleSlugs: targetRoleSlugs.filter(Boolean),
      targetMinTierLevel: targetMinTierLevel && !isNaN(targetMinTierLevel) ? targetMinTierLevel : null,
      createdBy: user.id,
      options: {
        create: options.map((text, i) => ({
          text: text.trim(),
          sortOrder: i,
        })),
      },
    },
  });

  await logAudit({
    userId: user.id,
    userName: user.name ?? "Unknown",
    action: "poll.create",
    targetType: "Poll",
    targetId: poll.id,
    details: { title: poll.title, isAnonymous, optionCount: options.length, targetRoleSlugs, targetMinTierLevel },
  });

  revalidatePath("/polls");
  return poll.id;
}

export async function castVote(pollId: string, optionId: string) {
  const user = await requireApprovedMember();

  const poll = await prisma.poll.findUnique({
    where: { id: pollId },
    include: { options: true },
  });

  if (!poll) throw new Error("Poll not found");
  if (poll.closedAt) throw new Error("Poll is closed");
  if (!canAccessPoll(user, poll)) throw new Error("You do not have access to this poll");
  if (!poll.options.some((o) => o.id === optionId)) {
    throw new Error("Invalid option");
  }

  await prisma.pollVote.upsert({
    where: { pollId_userId: { pollId, userId: user.id } },
    update: { optionId, updatedAt: new Date() },
    create: { pollId, optionId, userId: user.id },
  });

  revalidatePath(`/polls/${pollId}`);
}

export async function closePoll(pollId: string) {
  const user = await requirePollManager();

  const poll = await prisma.poll.findUnique({ where: { id: pollId } });
  if (!poll) throw new Error("Poll not found");
  if (poll.closedAt) throw new Error("Poll is already closed");

  await prisma.poll.update({
    where: { id: pollId },
    data: { closedAt: new Date(), closedBy: user.id },
  });

  await logAudit({
    userId: user.id,
    userName: user.name ?? "Unknown",
    action: "poll.close",
    targetType: "Poll",
    targetId: pollId,
    details: { title: poll.title },
  });

  revalidatePath(`/polls/${pollId}`);
  revalidatePath("/polls");
}
