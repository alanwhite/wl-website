import { prisma } from "./prisma";

interface AuditLogInput {
  userId: string;
  userName: string;
  action: string;
  targetType?: string;
  targetId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
}

export function logAudit(input: AuditLogInput): Promise<void> {
  return prisma.auditLog
    .create({
      data: {
        userId: input.userId,
        userName: input.userName,
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId,
        details: (input.details ?? {}) as object,
        ipAddress: input.ipAddress,
      },
    })
    .then(() => {})
    .catch((err) => {
      console.error("[audit] Failed to log:", err);
    });
}
