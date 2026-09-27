"use client";

import { Lock } from "lucide-react";
import { formatMealCardDayLabel, toISODate } from "@/lib/dates";
import { weekStripCells, type WeekStripNight } from "@/lib/week-strip";
import { cn } from "@/lib/utils";

export function WeekStrip({
  nights,
  selectedMealId,
  todayIso = toISODate(new Date()),
  locked = false,
  onSelect,
}: {
  nights: readonly WeekStripNight[];
  selectedMealId: string | null;
  todayIso?: string;
  locked?: boolean;
  onSelect: (mealId: string) => void;
}) {
  const cells = weekStripCells(nights);
  if (cells.length === 0) return null;

  return (
    <div
      data-slot="week-strip"
      data-locked={locked ? "true" : "false"}
      className="sticky top-[var(--shell-head-h)] z-10 -mx-4 bg-background/95 px-4 py-2 backdrop-blur-md"
    >
      <div role="group" aria-label="Jump to a night" className="flex gap-1">
        {cells.map((cell) => {
          const selected = cell.mealId === selectedMealId;
          const today = cell.nightDate === todayIso;
          const label = formatMealCardDayLabel(cell.nightDate);
          return (
            <button
              key={cell.mealId}
              type="button"
              data-slot="week-strip-cell"
              data-meal-id={cell.mealId}
              data-today={today ? "true" : "false"}
              data-selected={selected ? "true" : "false"}
              aria-pressed={selected}
              aria-current={today ? "date" : undefined}
              aria-label={locked ? `${label}, locked` : label}
              onClick={() => onSelect(cell.mealId)}
              className={cn(
                "relative flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center rounded-[12px] px-0.5",
                selected ? "bg-primary/15 text-primary" : "text-foreground",
                today && !selected && "bg-muted",
              )}
            >
              {locked ? (
                <Lock className="absolute top-1 right-1 size-2.5 text-muted-foreground" aria-hidden />
              ) : null}
              <span className="text-[11px] font-semibold leading-none text-muted-foreground">{cell.letter}</span>
              <span className="mt-1 text-sm font-semibold leading-none">{cell.day}</span>
              <span className="mt-0.5 h-3 text-[10px] font-semibold leading-3 text-muted-foreground">
                {cell.month ?? "\u00a0"}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
