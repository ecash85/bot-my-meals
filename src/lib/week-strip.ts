import { parseISODate, WEEKDAY_SHORT } from "./dates";

const MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

export type WeekStripNight = {
  id: string;
  nightDate: string;
};

export type WeekStripCell = {
  mealId: string;
  nightDate: string;
  letter: string;
  day: number;
  /** Set on the first cell and again when the week crosses into a new month. */
  month: string | null;
};

export function weekStripCells(nights: readonly WeekStripNight[]): WeekStripCell[] {
  let previousMonth = -1;
  return nights.map((night) => {
    const date = parseISODate(night.nightDate);
    const monthIndex = date.getMonth();
    const showMonth = monthIndex !== previousMonth;
    previousMonth = monthIndex;
    const weekday = WEEKDAY_SHORT[date.getDay()] ?? "Sun";
    return {
      mealId: night.id,
      nightDate: night.nightDate,
      letter: weekday.slice(0, 1),
      day: date.getDate(),
      month: showMonth ? (MONTH_ABBR[monthIndex] ?? null) : null,
    };
  });
}

export function nightCardAnchorId(mealId: string): string {
  return `night-card-${mealId}`;
}

export type NightCardFocusTarget = {
  scrollIntoView: (options: ScrollIntoViewOptions) => void;
  focus: (options?: FocusOptions) => void;
};

/** Scroll the existing meal card into view. Stays on This week — no route change. */
export function focusNightCard(
  mealId: string,
  lookup: (id: string) => NightCardFocusTarget | null,
): boolean {
  const card = lookup(nightCardAnchorId(mealId));
  if (!card) return false;
  card.scrollIntoView({ behavior: "smooth", block: "start" });
  card.focus({ preventScroll: true });
  return true;
}
