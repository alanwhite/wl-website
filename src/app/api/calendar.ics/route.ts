import { prisma } from "@/lib/prisma";
import { getSiteInfo } from "@/lib/config";
import { NextResponse } from "next/server";

function escapeIcal(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function formatIcalDate(date: Date, allDay: boolean): string {
  if (allDay) {
    return date.toISOString().slice(0, 10).replace(/-/g, "");
  }
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function recurrenceToRRule(recurrence: string): string | null {
  switch (recurrence) {
    case "weekly": return "RRULE:FREQ=WEEKLY";
    case "monthly": return "RRULE:FREQ=MONTHLY";
    case "yearly": return "RRULE:FREQ=YEARLY";
    default: return null;
  }
}

export async function GET() {
  const [events, siteInfo] = await Promise.all([
    prisma.calendarEvent.findMany({
      orderBy: { startDate: "asc" },
    }),
    getSiteInfo(),
  ]);

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//${escapeIcal(siteInfo.name)}//Events//EN`,
    `X-WR-CALNAME:${escapeIcal(siteInfo.name)}`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  for (const event of events) {
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${event.id}@${process.env.AUTH_URL?.replace(/^https?:\/\//, "") ?? "localhost"}`);
    lines.push(`DTSTAMP:${formatIcalDate(event.updatedAt, false)}`);

    if (event.allDay) {
      lines.push(`DTSTART;VALUE=DATE:${formatIcalDate(event.startDate, true)}`);
      lines.push(`DTEND;VALUE=DATE:${formatIcalDate(event.endDate, true)}`);
    } else {
      lines.push(`DTSTART:${formatIcalDate(event.startDate, false)}`);
      lines.push(`DTEND:${formatIcalDate(event.endDate, false)}`);
    }

    lines.push(`SUMMARY:${escapeIcal(event.title)}`);

    if (event.description) {
      lines.push(`DESCRIPTION:${escapeIcal(event.description)}`);
    }
    if (event.location) {
      lines.push(`LOCATION:${escapeIcal(event.location)}`);
    }

    if (event.recurrence) {
      const rrule = recurrenceToRRule(event.recurrence);
      if (rrule) {
        let rule = rrule;
        if (event.recurrenceEnd) {
          rule += `;UNTIL=${formatIcalDate(event.recurrenceEnd, false)}`;
        }
        lines.push(rule);
      }
    }

    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");

  const ical = lines.join("\r\n");

  return new NextResponse(ical, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": "attachment; filename=calendar.ics",
      "Cache-Control": "public, max-age=300",
    },
  });
}
