const DAY_MS = 24 * 60 * 60 * 1000;

export const WEEKDAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

const MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(iso: string, days: number): string {
  return toISODate(new Date(parseISODate(iso).getTime() + days * DAY_MS));
}

export function startOfWeek(date: Date, weekStartsOn: number): string {
  const day = date.getDay();
  const diff = (day - weekStartsOn + 7) % 7;
  return toISODate(new Date(date.getFullYear(), date.getMonth(), date.getDate() - diff));
}

export function formatNightDate(iso: string): string {
  const date = parseISODate(iso);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function formatWeekRange(startsOn: string): string {
  const end = addDays(startsOn, 6);
  const startDate = parseISODate(startsOn);
  const endDate = parseISODate(end);
  const startLabel = startDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const endLabel = endDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  return `${startLabel} – ${endLabel}`;
}

export function formatWeekEyebrow(startsOn: string, locked = false): string {
  const range = formatWeekRange(startsOn);
  return locked ? `${range} · Locked` : range;
}

/** This week meal-card kicker: `Sun · Sep 27`. Month stays on the card when a week spans two months. */
export function formatMealCardDayLabel(iso: string): string {
  const date = parseISODate(iso);
  const weekday = WEEKDAY_SHORT[date.getDay()];
  const month = MONTH_ABBR[date.getMonth()];
  return `${weekday} · ${month} ${date.getDate()}`;
}

export function mealCardControlId(prefix: string, dayLabel: string): string {
  const slug = dayLabel
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${prefix}-${slug || "night"}`;
}

export function weekdayShortFromNight(nightDate: string): string {
  return WEEKDAY_SHORT[weekdayIndexFromDate(nightDate)];
}

export function weekdayLabelFromNight(nightDate: string): string {
  return WEEKDAY_LABELS[weekdayIndexFromDate(nightDate)];
}

export function weekdayIndexFromDate(iso: string): number {
  return parseISODate(iso).getDay();
}
