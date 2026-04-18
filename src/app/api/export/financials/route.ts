import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getFinancialManagerRoles,
  getFinancialViewerRoles,
  canViewFinancials,
} from "@/lib/config";
import { NextRequest, NextResponse } from "next/server";
import { format, startOfMonth, endOfMonth } from "date-fns";

function escapeCsv(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.status !== "APPROVED") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [managerRoles, viewerRoles] = await Promise.all([
    getFinancialManagerRoles(),
    getFinancialViewerRoles(),
  ]);

  if (!canViewFinancials(session.user, viewerRoles, managerRoles)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Optional month/year filter
  const monthParam = request.nextUrl.searchParams.get("month");
  const yearParam = request.nextUrl.searchParams.get("year");

  let where = {};
  let filenameSuffix = format(new Date(), "yyyy-MM-dd");

  if (monthParam && yearParam) {
    const month = parseInt(monthParam);
    const year = parseInt(yearParam);
    const periodStart = startOfMonth(new Date(year, month - 1));
    const periodEnd = endOfMonth(new Date(year, month - 1));
    where = { date: { gte: periodStart, lte: periodEnd } };
    filenameSuffix = `${year}-${String(month).padStart(2, "0")}`;
  } else if (yearParam) {
    const year = parseInt(yearParam);
    where = { date: { gte: new Date(year, 0, 1), lte: new Date(year, 11, 31, 23, 59, 59) } };
    filenameSuffix = `${year}`;
  }

  const transactions = await prisma.transaction.findMany({
    where,
    orderBy: { date: "asc" },
  });

  const header = "Date,Type,Category,Description,Amount,Reference";
  const rows = transactions.map((tx) =>
    [
      format(tx.date, "yyyy-MM-dd"),
      tx.type,
      escapeCsv(tx.category),
      escapeCsv(tx.description),
      (tx.amount / 100).toFixed(2),
      escapeCsv(tx.reference ?? ""),
    ].join(","),
  );

  const csv = [header, ...rows].join("\n");
  const filename = `transactions-${filenameSuffix}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
