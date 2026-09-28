import { addDays, parseISODate, WEEKDAY_SHORT } from "./dates";

const MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

export const WEEK_STRIP_LENGTH = 7;

export type WeekStripNight = {
  id: string;
  nightDate: string;
  /** False for a removed, blank, or pending night — the day still occupies its cell. */
  hasMeal: boolean;
};

export type WeekStripCell = {
  mealId: string | null;
  nightDate: string;
  letter: string;
  day: number;
  /** Set on the first cell and again when the week crosses into a new month. */
  month: string | null;
  hasMeal: boolean;
};

function preferMealNight(
  current: WeekStripNight | undefined,
  next: WeekStripNight,
): WeekStripNight {
  if (!current || (!current.hasMeal && next.hasMeal)) return next;
  return current;
}

/** Sun–Sat (or whatever `startsOn` begins) — always seven cells, including nights with no meal. */
export function weekStripCells(
  startsOn: string,
  nights: readonly WeekStripNight[],
): WeekStripCell[] {
  const byDate = new Map<string, WeekStripNight>();
  for (const night of nights) {
    byDate.set(night.nightDate, preferMealNight(byDate.get(night.nightDate), night));
  }

  let previousMonth = -1;
  return Array.from({ length: WEEK_STRIP_LENGTH }, (_, index) => {
    const nightDate = addDays(startsOn, index);
    const date = parseISODate(nightDate);
    const monthIndex = date.getMonth();
    const showMonth = monthIndex !== previousMonth;
    previousMonth = monthIndex;
    const night = byDate.get(nightDate);
    const hasMeal = night?.hasMeal === true;
    const weekday = WEEKDAY_SHORT[date.getDay()] ?? "Sun";
    return {
      mealId: hasMeal && night ? night.id : null,
      nightDate,
      letter: weekday.slice(0, 1),
      day: date.getDate(),
      month: showMonth ? (MONTH_ABBR[monthIndex] ?? null) : null,
      hasMeal,
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
