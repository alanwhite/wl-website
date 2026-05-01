"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";
import { getPollManagerRoles, canManagePolls, canAccessPoll } from "@/lib/config";
import { sendPushNotifications } from "@/lib/push";

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

async function snapshotResults(pollId: string) {
  const poll = await prisma.poll.findUnique({
    where: { id: pollId },
    include: {
      options: { orderBy: { sortOrder: "asc" } },
      votes: true,
    },
  });
  if (!poll) return {};
  return {
    title: poll.title,
    totalVotes: poll.votes.length,
    results: poll.options.map((o) => ({
      option: o.text,
      votes: poll.votes.filter((v) => v.optionId === o.id).length,
    })),
  };
}

export async function createPoll(formData: FormData) {
  const user = await requirePollManager();

  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const isAnonymous = formData.get("isAnonymous") === "on";
  const maxVotesRaw = formData.get("maxVotes") as string;
  const maxVotes = maxVotesRaw ? parseInt(maxVotesRaw, 10) : 1;
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
      maxVotes: isNaN(maxVotes) ? 1 : maxVotes,
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
    details: { title: poll.title, isAnonymous, maxVotes, optionCount: options.length, targetRoleSlugs, targetMinTierLevel },
  });

  // Send push notifications (non-blocking)
  sendPushNotifications({
    type: "polls",
    title: poll.title,
    body: `New poll: ${poll.title}`,
    url: "/polls",
    tag: `poll-${poll.id}`,
    targetRoleSlugs: targetRoleSlugs.filter(Boolean),
    targetMinTierLevel,
    excludeUserId: user.id,
  }).catch((err) => console.error("[Push] Failed to send poll notifications:", err));

  revalidatePath("/polls");
  return poll.id;
}

export async function castVotes(pollId: string, optionIds: string[]) {
  const user = await requireApprovedMember();

  const poll = await prisma.poll.findUnique({
    where: { id: pollId },
    include: { options: true },
  });

  if (!poll) throw new Error("Poll not found");
  if (poll.closedAt) throw new Error("Poll is closed");
  if (!canAccessPoll(user, poll)) throw new Error("You do not have access to this poll");

  // Validate option IDs
  const validIds = new Set(poll.options.map((o) => o.id));
  for (const id of optionIds) {
    if (!validIds.has(id)) throw new Error("Invalid option");
  }

  // Validate vote count
  if (poll.maxVotes > 0 && optionIds.length > poll.maxVotes) {
    throw new Error(`You can select at most ${poll.maxVotes} option${poll.maxVotes === 1 ? "" : "s"}`);
  }

  // Replace strategy: delete existing votes and create new ones
  await prisma.$transaction([
    prisma.pollVote.deleteMany({ where: { pollId, userId: user.id } }),
    ...optionIds.map((optionId) =>
      prisma.pollVote.create({ data: { pollId, optionId, userId: user.id } }),
    ),
  ]);

  revalidatePath(`/polls/${pollId}`);
}

// Backward compatible — single vote
export async function castVote(pollId: string, optionId: string) {
  return castVotes(pollId, [optionId]);
}

export async function closePoll(pollId: string) {
  const user = await requirePollManager();

  const poll = await prisma.poll.findUnique({ where: { id: pollId } });
  if (!poll) throw new Error("Poll not found");
  if (poll.closedAt) throw new Error("Poll is already closed");

  const results = await snapshotResults(pollId);

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
    details: results,
  });

  revalidatePath(`/polls/${pollId}`);
  revalidatePath("/polls");
}

export async function deletePoll(pollId: string) {
  const user = await requirePollManager();

  const results = await snapshotResults(pollId);

  await prisma.poll.delete({ where: { id: pollId } });

  await logAudit({
    userId: user.id,
    userName: user.name ?? "Unknown",
    action: "poll.delete",
    targetType: "Poll",
    targetId: pollId,
    details: results,
  });

  revalidatePath("/polls");
}
