"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getFinancialManagerRoles, canManageFinancials } from "@/lib/config";
import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";

async function requireFinancialManager() {
  const session = await auth();
  if (!session?.user || session.user.status !== "APPROVED") {
    throw new Error("Unauthorized");
  }
  const managerRoles = await getFinancialManagerRoles();
  if (!canManageFinancials(session.user, managerRoles)) {
    throw new Error("Unauthorized: requires financial manager role");
  }
  return session.user;
}

export async function createTransaction(data: {
  date: string;
  type: string;
  category: string;
  description: string;
  amount: number; // in pence
  reference?: string;
}) {
  const user = await requireFinancialManager();

  const transaction = await prisma.transaction.create({
    data: {
      date: new Date(data.date),
      type: data.type,
      category: data.category,
      description: data.description,
      amount: data.amount,
      reference: data.reference || null,
      createdBy: user.id,
    },
  });

  await logAudit({
    userId: user.id,
    userName: user.name ?? "Treasurer",
    action: "financial.transaction.create",
    targetType: "Transaction",
    targetId: transaction.id,
    details: {
      type: data.type,
      category: data.category,
      amount: data.amount,
      description: data.description,
    },
  });

  revalidatePath("/financials");
  return transaction;
}

export async function updateTransaction(
  transactionId: string,
  data: {
    date: string;
    type: string;
    category: string;
    description: string;
    amount: number;
    reference?: string;
  },
) {
  const user = await requireFinancialManager();

  const transaction = await prisma.transaction.update({
    where: { id: transactionId },
    data: {
      date: new Date(data.date),
      type: data.type,
      category: data.category,
      description: data.description,
      amount: data.amount,
      reference: data.reference || null,
    },
  });

  await logAudit({
    userId: user.id,
    userName: user.name ?? "Treasurer",
    action: "financial.transaction.update",
    targetType: "Transaction",
    targetId: transactionId,
    details: {
      type: data.type,
      category: data.category,
      amount: data.amount,
    },
  });

  revalidatePath("/financials");
  return transaction;
}

export async function deleteTransaction(transactionId: string) {
  const user = await requireFinancialManager();

  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
    select: { description: true, amount: true, type: true },
  });

  await prisma.transaction.delete({ where: { id: transactionId } });

  await logAudit({
    userId: user.id,
    userName: user.name ?? "Treasurer",
    action: "financial.transaction.delete",
    targetType: "Transaction",
    targetId: transactionId,
    details: {
      description: transaction?.description,
      amount: transaction?.amount,
      type: transaction?.type,
    },
  });

  revalidatePath("/financials");
}
