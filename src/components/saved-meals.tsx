"use client";

import Link from "next/link";
import {
  ALREADY_REQUESTED_TOAST,
  REMOVE_SAVED_LABEL,
  REQUEST_NEXT_WEEK_LABEL,
  REQUESTED_LABEL,
  REQUESTED_TOAST,
  SAVED_MEALS_EMPTY_BACK,
  SAVED_MEALS_EMPTY_BODY,
  SAVED_MEALS_EMPTY_TITLE,
  SAVED_MEALS_HELPER,
  UNSAVE_TOAST,
  savedMealCooldownLabel,
  savedMealRequestActive,
  savedMealWhenLine,
  sortSavedMeals,
} from "@/lib/saved-meals";
import type { SavedMeal } from "@/lib/types";
import { cn } from "@/lib/utils";

export function SavedMealsList({
  meals,
  timeZone,
  currentWeekStartsOn,
  canAct,
  detailHrefByKey,
  now,
  onRemove,
  onRequest,
}: {
  meals: SavedMeal[];
  timeZone: string;
  currentWeekStartsOn: string;
  canAct: boolean;
  detailHrefByKey: ReadonlyMap<string, string>;
  now: Date;
  onRemove: (recipeKey: string) => Promise<void>;
  onRequest: (recipeKey: string) => Promise<"requested" | "already">;
}) {
  const visible = sortSavedMeals(meals);
  if (visible.length === 0) {
    return (
      <div data-slot="saved-meals-empty" className="rounded-[14px] bg-card p-5 shadow-card">
        <h2 className="type-section">{SAVED_MEALS_EMPTY_TITLE}</h2>
        <p className="type-body mt-2 text-muted-foreground">{SAVED_MEALS_EMPTY_BODY}</p>
        <Link
          href="/week"
          className="tap-target mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-primary"
        >
          {SAVED_MEALS_EMPTY_BACK}
        </Link>
      </div>
    );
  }

  return (
    <div data-slot="saved-meals-list">
      <p data-slot="saved-meals-helper" className="type-meta text-muted-foreground">
        {SAVED_MEALS_HELPER}
      </p>
      <ul className="mt-4 space-y-3">
        {visible.map((meal) => (
          <SavedMealRow
            key={meal.recipeKey}
            meal={meal}
            timeZone={timeZone}
            currentWeekStartsOn={currentWeekStartsOn}
            canAct={canAct}
            detailHref={detailHrefByKey.get(meal.recipeKey)}
            now={now}
            onRemove={onRemove}
            onRequest={onRequest}
          />
        ))}
      </ul>
    </div>
  );
}

function SavedMealRow({
  meal,
  timeZone,
  currentWeekStartsOn,
  canAct,
  detailHref,
  now,
  onRemove,
  onRequest,
}: {
  meal: SavedMeal;
  timeZone: string;
  currentWeekStartsOn: string;
  canAct: boolean;
  detailHref?: string;
  now: Date;
  onRemove: (recipeKey: string) => Promise<void>;
  onRequest: (recipeKey: string) => Promise<"requested" | "already">;
}) {
  const requested = savedMealRequestActive(meal, currentWeekStartsOn);
  const cooldown = requested ? null : savedMealCooldownLabel(meal.lastLockedAt, now);
  const title = detailHref ? (
    <Link href={detailHref} className="type-body font-semibold">
      {meal.title}
    </Link>
  ) : (
    <p className="type-body font-semibold">{meal.title}</p>
  );

  return (
    <li data-slot="saved-meal-row" className="rounded-[14px] bg-card px-5 py-4 shadow-card">
      {title}
      <p className="type-meta mt-1 text-muted-foreground">{savedMealWhenLine(meal, timeZone)}</p>
      {cooldown ? (
        <p data-slot="saved-meal-cooldown" className="type-chip mt-2 text-muted-foreground">
          {cooldown}
        </p>
      ) : null}
      {canAct ? (
        <div className="mt-3 flex flex-col gap-2">
          <button
            type="button"
            data-slot="saved-meal-request"
            disabled={requested}
            aria-disabled={requested}
            onClick={() => {
              void onRequest(meal.recipeKey).catch(() => undefined);
            }}
            className={cn(
              "tap-target inline-flex min-h-11 w-full items-center justify-center rounded-[var(--radius-button)] border px-3 text-sm font-semibold",
              requested
                ? "border-transparent bg-secondary text-muted-foreground"
                : "border-border bg-card text-foreground",
            )}
          >
            {requested ? REQUESTED_LABEL : REQUEST_NEXT_WEEK_LABEL}
          </button>
          <button
            type="button"
            data-slot="saved-meal-remove"
            onClick={() => {
              void onRemove(meal.recipeKey).catch(() => undefined);
            }}
            className="tap-target inline-flex min-h-11 w-full items-center justify-center rounded-[var(--radius-button)] border border-border bg-card px-3 text-sm font-semibold"
          >
            {REMOVE_SAVED_LABEL}
          </button>
        </div>
      ) : null}
    </li>
  );
}

export function savedMealRequestToast(result: "requested" | "already"): string {
  switch (result) {
    case "requested":
      return REQUESTED_TOAST;
    case "already":
      return ALREADY_REQUESTED_TOAST;
    default: {
      const _exhaustive: never = result;
      return _exhaustive;
    }
  }
}

export function savedMealRemoveToast(): string {
  return UNSAVE_TOAST;
}
