import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getGroupManagerRoles, canManageGroups, getGroupMemberFields, getGroupLabel } from "@/lib/config";
import { NextResponse } from "next/server";

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

  const managerRoles = await getGroupManagerRoles();
  if (!canManageGroups(session.user, managerRoles)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [groups, memberFields, groupLabel] = await Promise.all([
    prisma.group.findMany({
      where: { rsvpStatus: "attending" },
      orderBy: { name: "asc" },
      include: {
        groupMembers: { orderBy: { createdAt: "asc" } },
      },
    }),
    getGroupMemberFields(),
    getGroupLabel(),
  ]);

  const fieldNames = memberFields.map((f) => f.name);
  const fieldLabels = memberFields.map((f) => f.label);

  const header = [groupLabel, "Name", ...fieldLabels, "Dietary Requirements"].join(",");

  const rows: string[] = [];
  for (const group of groups) {
    for (const member of group.groupMembers) {
      const data = (member.data as Record<string, string>) ?? {};
      const fieldValues = fieldNames.map((name) => escapeCsv(data[name] ?? ""));
      const dietary = escapeCsv(data.dietary ?? "");
      rows.push([
        escapeCsv(group.name),
        escapeCsv(member.name),
        ...fieldValues,
        // Only add dietary if it's not already in the fields
        ...(fieldNames.includes("dietary") ? [] : [dietary]),
      ].join(","));
    }
  }

  const csv = [header, ...rows].join("\n");
  const filename = `meal-choices-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
