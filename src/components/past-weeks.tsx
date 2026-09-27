"use client";

import Link from "next/link";
import {
  HISTORY_UI_LIMIT,
  PAST_WEEKS_EMPTY,
  PAST_WEEKS_HELPER,
  historyNightLine,
  historyWeekRowLabel,
} from "@/lib/meal-history";
import type { MealHistoryWeek } from "@/lib/types";

export function PastWeeksList({ weeks }: { weeks: MealHistoryWeek[] }) {
  const visible = weeks.slice(0, HISTORY_UI_LIMIT);
  if (visible.length === 0) {
    return (
      <p data-slot="past-weeks-empty" className="type-body text-muted-foreground">
        {PAST_WEEKS_EMPTY}
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {visible.map((week) => (
        <li key={week.startsOn}>
          <Link
            href={`/settings/history/${week.startsOn}`}
            data-slot="past-week-row"
            className="type-body flex min-h-12 items-center rounded-[14px] bg-card px-5 shadow-card"
          >
            {historyWeekRowLabel(week.startsOn, week.nights.length)}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function PastWeekDetail({ week }: { week: MealHistoryWeek }) {
  return (
    <div data-slot="past-week-detail">
      <p data-slot="past-weeks-helper" className="type-meta text-muted-foreground">
        {PAST_WEEKS_HELPER}
      </p>
      <ul className="mt-4 space-y-3">
        {week.nights.map((night) => (
          <li
            key={night.nightDate}
            data-slot="past-week-night"
            className="type-body rounded-[14px] bg-card px-5 py-4 shadow-card"
          >
            {historyNightLine(night)}
          </li>
        ))}
      </ul>
    </div>
  );
}
