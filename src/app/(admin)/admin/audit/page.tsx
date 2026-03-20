import { prisma } from "@/lib/prisma";
import { AuditLogTable } from "@/components/admin/audit-log-table";

export const dynamic = "force-dynamic";

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; action?: string }>;
}) {
  const params = await searchParams;
  const page = parseInt(params.page ?? "1");
  const pageSize = 25;
  const actionFilter = params.action;

  const where = actionFilter ? { action: { contains: actionFilter } } : {};

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.auditLog.count({ where }),
  ]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Audit Log</h1>
      <AuditLogTable
        logs={logs.map((log) => ({
          ...log,
          details: log.details as Record<string, unknown>,
        }))}
        currentPage={page}
        totalPages={totalPages}
        actionFilter={actionFilter ?? ""}
      />
    </div>
  );
}
