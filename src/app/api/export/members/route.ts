import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMemberManagerRoles, canManageMembers } from "@/lib/config";
import { NextResponse } from "next/server";
import { format } from "date-fns";

function escapeCsv(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.status !== "APPROVED") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const managerRoles = await getMemberManagerRoles();
  if (!canManageMembers(session.user, managerRoles)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      userRoles: { include: { role: { select: { name: true } } } },
    },
  });

  const header = "Name,Email,Status,Tier,Roles,Joined";
  const rows = users.map((u) => {
    const roles = u.userRoles.map((ur) => ur.role.name).join("; ");
    return [
      escapeCsv(u.name ?? ""),
      escapeCsv(u.email ?? ""),
      u.status,
      u.tierName,
      escapeCsv(roles),
      format(u.createdAt, "yyyy-MM-dd"),
    ].join(",");
  });

  const csv = [header, ...rows].join("\n");
  const filename = `members-${format(new Date(), "yyyy-MM-dd")}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
