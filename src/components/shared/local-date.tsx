"use client";

import { format } from "date-fns";

interface LocalDateProps {
  date: Date | string;
  dateFormat?: string;
  className?: string;
}

/**
 * Renders a date/time in the viewer's local timezone.
 * Must be a client component since server components run in UTC.
 */
export function LocalDate({
  date,
  dateFormat = "EEE d MMM yyyy, h:mm a",
  className,
}: LocalDateProps) {
  const d = new Date(date);
  return <span className={className}>{format(d, dateFormat)}</span>;
}
