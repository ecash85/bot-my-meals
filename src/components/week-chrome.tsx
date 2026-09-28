"use client";

import { useLayoutEffect, useRef, type Ref } from "react";
import { ChevronRight, ClipboardList, UtensilsCrossed } from "lucide-react";
import Link from "next/link";
import { WeekStrip } from "@/components/week-strip";
import { LOCK_SUCCESS_LIST_CTA, lockSuccessRecipesKicker } from "@/lib/lock-success";
import type { WeekStripNight } from "@/lib/week-strip";
import { cn } from "@/lib/utils";

export type WeekChromeMeal = {
  id: string;
  title: string;
  weekday: string;
};

export function WeekChrome({
  nights,
  selectedMealId,
  todayIso,
  locked,
  mutedDates,
  showShoppingList,
  firstMeal,
  onSelect,
  onHeight,
}: {
  nights: readonly WeekStripNight[];
  selectedMealId: string | null;
  todayIso: string;
  locked: boolean;
  mutedDates: readonly string[];
  showShoppingList: boolean;
  firstMeal: WeekChromeMeal | null;
  onSelect: (mealId: string) => void;
  onHeight?: (height: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !onHeight) return;
    const update = () => onHeight(el.offsetHeight);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [onHeight, showShoppingList, firstMeal, locked, nights.length]);

  return (
    <WeekChromeView
      rootRef={ref}
      nights={nights}
      selectedMealId={selectedMealId}
      todayIso={todayIso}
      locked={locked}
      mutedDates={mutedDates}
      showShoppingList={showShoppingList}
      firstMeal={firstMeal}
      onSelect={onSelect}
    />
  );
}

export function WeekChromeView({
  nights,
  selectedMealId,
  todayIso,
  locked,
  mutedDates,
  showShoppingList,
  firstMeal,
  onSelect,
  rootRef,
}: {
  nights: readonly WeekStripNight[];
  selectedMealId: string | null;
  todayIso: string;
  locked: boolean;
  mutedDates: readonly string[];
  showShoppingList: boolean;
  firstMeal: WeekChromeMeal | null;
  onSelect: (mealId: string) => void;
  rootRef?: Ref<HTMLDivElement>;
}) {
  const showRows = showShoppingList || Boolean(firstMeal);
  return (
    <div
      ref={rootRef}
      data-slot="week-chrome"
      data-locked={locked ? "true" : "false"}
      className="sticky top-[calc(var(--shell-head-h)-1px)] z-10 -mx-4 min-w-0 overflow-x-hidden bg-background pb-3"
    >
      <section
        className={cn(
          "min-w-0 max-w-full rounded-[12px] p-4 shadow-card ring-1 ring-foreground/10",
          locked ? "bg-primary/5" : "bg-card",
        )}
      >
        <WeekStrip
          nights={nights}
          selectedMealId={selectedMealId}
          todayIso={todayIso}
          locked={locked}
          mutedDates={mutedDates}
          onSelect={onSelect}
        />
        {showRows ? (
          <div className="mt-4 space-y-2">
            {showShoppingList ? (
              <Link
                href="/list"
                data-slot="lock-success-list"
                aria-label={LOCK_SUCCESS_LIST_CTA}
                className="flex min-h-12 w-full items-center gap-3 rounded-[12px] bg-primary px-4 py-3 text-primary-foreground"
              >
                <ClipboardList className="size-5 shrink-0" aria-hidden />
                <span className="min-w-0 flex-1 truncate text-base font-semibold text-white">
                  {LOCK_SUCCESS_LIST_CTA}
                </span>
                <ChevronRight className="size-5 shrink-0" aria-hidden />
              </Link>
            ) : null}
            {firstMeal ? (
              <Link
                href={`/week/${firstMeal.id}`}
                data-slot="lock-success-recipes"
                aria-label={`${lockSuccessRecipesKicker(firstMeal.weekday)}, ${firstMeal.title}`}
                className="flex min-h-12 w-full items-center gap-3 rounded-[12px] bg-primary px-4 py-3 text-primary-foreground"
              >
                <UtensilsCrossed className="size-5 shrink-0" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] leading-[18px] text-white/80">
                    {lockSuccessRecipesKicker(firstMeal.weekday)}
                  </span>
                  <span className="block truncate text-base font-semibold text-white">{firstMeal.title}</span>
                </span>
                <ChevronRight className="size-5 shrink-0" aria-hidden />
              </Link>
            ) : null}
          </div>
        ) : null}
      </section>
    </div>
  );
}
