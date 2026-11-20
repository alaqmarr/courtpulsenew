import { formatInTimeZone } from "date-fns-tz";

const DEFAULT_TZ = "Asia/Kolkata";

export function formatDateIST(
  date: Date | string | number,
  pattern = "dd MMM yyyy"
): string {
  const parsed = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(parsed.getTime())) return "";
  return formatInTimeZone(parsed, DEFAULT_TZ, pattern);
}

export function formatDateTimeIST(date: Date | string | number): string {
  return formatDateIST(date, "dd MMM yyyy, h:mm a");
}
