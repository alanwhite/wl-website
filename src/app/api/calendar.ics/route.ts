import { prisma } from "@/lib/prisma";
import { getSiteInfo, getSiteTimezone } from "@/lib/config";
import { NextResponse } from "next/server";

function escapeIcal(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

/**
 * Format a UTC Date as a local-time iCal string in the given timezone.
 * Uses Intl.DateTimeFormat to get the local time components.
 */
function formatInTimezone(date: Date, timezone: string): string {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  return `${get("year")}${get("month")}${get("day")}T${get("hour")}${get("minute")}${get("second")}`;
}

function formatDateOnly(date: Date, timezone: string): string {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = fmt.formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  return `${get("year")}${get("month")}${get("day")}`;
}

function formatUtc(date: Date): string {
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
  const [events, siteInfo, timezone] = await Promise.all([
    prisma.calendarEvent.findMany({
      orderBy: { startDate: "asc" },
    }),
    getSiteInfo(),
    getSiteTimezone(),
  ]);

  const domain = process.env.AUTH_URL?.replace(/^https?:\/\//, "") ?? "localhost";

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//${escapeIcal(siteInfo.name)}//Events//EN`,
    `X-WR-CALNAME:${escapeIcal(siteInfo.name)}`,
    `X-WR-TIMEZONE:${timezone}`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  for (const event of events) {
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${event.id}@${domain}`);
    lines.push(`DTSTAMP:${formatUtc(event.updatedAt)}`);

    if (event.allDay) {
      lines.push(`DTSTART;VALUE=DATE:${formatDateOnly(event.startDate, timezone)}`);
      lines.push(`DTEND;VALUE=DATE:${formatDateOnly(event.endDate, timezone)}`);
    } else {
      lines.push(`DTSTART;TZID=${timezone}:${formatInTimezone(event.startDate, timezone)}`);
      lines.push(`DTEND;TZID=${timezone}:${formatInTimezone(event.endDate, timezone)}`);
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
          rule += `;UNTIL=${formatInTimezone(event.recurrenceEnd, timezone)}`;
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
