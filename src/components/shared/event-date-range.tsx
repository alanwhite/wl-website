"use client";

import { format } from "date-fns";

interface EventDateRangeProps {
  startDate: Date | string;
  endDate: Date | string;
  allDay: boolean;
  variant?: "list" | "detail";
  className?: string;
}

function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function EventDateRange({
  startDate,
  endDate,
  allDay,
  variant = "list",
  className,
}: EventDateRangeProps) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const sameDay = isSameLocalDay(start, end);

  const long = variant === "detail";
  const dayFmt = long ? "EEEE d MMMM yyyy" : "EEE d MMM yyyy";
  const dayInMonthFmt = long ? "EEEE d" : "EEE d";
  const dateTimeFmt = long ? "EEEE d MMMM yyyy, h:mm a" : "EEE d MMM yyyy, h:mm a";
  const timeFmt = "h:mm a";

  let text: string;

  if (allDay) {
    if (sameDay) {
      text = format(start, dayFmt);
    } else if (
      start.getFullYear() === end.getFullYear() &&
      start.getMonth() === end.getMonth()
    ) {
      text = `${format(start, dayInMonthFmt)} – ${format(end, dayFmt)}`;
    } else {
      text = `${format(start, dayFmt)} – ${format(end, dayFmt)}`;
    }
  } else if (sameDay) {
    text = `${format(start, dateTimeFmt)} – ${format(end, timeFmt)}`;
  } else {
    text = `${format(start, dateTimeFmt)} – ${format(end, dateTimeFmt)}`;
  }

  return <span className={className}>{text}</span>;
}
