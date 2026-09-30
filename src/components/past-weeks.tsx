"use client";

import Link from "next/link";
import { AheadPrepNotice } from "@/components/ahead-prep";
import { addDays } from "@/lib/dates";
import {
  HISTORY_UI_LIMIT,
  PAST_WEEKS_EMPTY,
  historyNightLine,
  historyWeekRowLabel,
} from "@/lib/meal-history";
import type { PrepNotice } from "@/lib/cook-timing";
import type { MealHistoryWeek } from "@/lib/types";
import { PAST_TITLES_ONLY, navigatorHref } from "@/lib/week-navigator";
import { nightCardAnchorId } from "@/lib/week-strip";

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
            href={navigatorHref({ kind: "past", startsOn: week.startsOn })}
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

export function PastWeekDetail({
  week,
  notices = [],
}: {
  week: MealHistoryWeek;
  notices?: PrepNotice[];
}) {
  const weekEnd = addDays(week.startsOn, 6);
  const inWeek = notices.filter((notice) => notice.showOn >= week.startsOn && notice.showOn <= weekEnd);
  const nightDates = new Set(week.nights.map((night) => night.nightDate));
  const loose = inWeek.filter((notice) => !nightDates.has(notice.showOn));

  return (
    <div data-slot="past-week-detail">
      <p data-slot="past-titles-only" className="type-meta text-muted-foreground">
        {PAST_TITLES_ONLY}
      </p>
      {loose.length ? (
        <div className="mt-4 space-y-2">
          {loose.map((notice) => (
            <AheadPrepNotice key={`${notice.showOn}-${notice.mealId}`} text={notice.text} />
          ))}
        </div>
      ) : null}
      <ul className="mt-4 space-y-3">
        {week.nights.map((night) => {
          const dayNotices = inWeek.filter((notice) => notice.showOn === night.nightDate);
          return (
            <li
              key={night.nightDate}
              id={nightCardAnchorId(night.nightDate)}
              tabIndex={-1}
              data-slot="past-week-night"
              className="scroll-mt-[calc(var(--shell-head-h)+0.25rem)] space-y-2 rounded-[14px] outline-none focus:ring-2 focus:ring-primary/40"
            >
              {dayNotices.map((notice) => (
                <AheadPrepNotice key={`${notice.showOn}-${notice.mealId}`} text={notice.text} />
              ))}
              <div className="type-body rounded-[14px] bg-card px-5 py-4 shadow-card">
                {historyNightLine(night)}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
