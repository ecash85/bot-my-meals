"use client";

import { formatMealCardDayLabel } from "@/lib/dates";
import { weekStripCells, type WeekStripNight } from "@/lib/week-strip";
import { cn } from "@/lib/utils";

export function WeekStrip({
  nights,
  selectedMealId,
  todayIso,
  locked = false,
  mutedDates = [],
  onSelect,
}: {
  nights: readonly WeekStripNight[];
  selectedMealId: string | null;
  todayIso: string;
  locked?: boolean;
  mutedDates?: readonly string[];
  onSelect: (mealId: string) => void;
}) {
  const cells = weekStripCells(nights);
  if (cells.length === 0) return null;
  const muted = new Set(mutedDates);

  return (
    <div data-slot="week-strip" data-locked={locked ? "true" : "false"} className="overflow-x-auto py-3">
      <div role="group" aria-label="Jump to a night" className="flex w-max min-w-full gap-2">
        {cells.map((cell) => {
          const selected = cell.mealId === selectedMealId;
          const today = cell.nightDate === todayIso;
          const past = muted.has(cell.nightDate);
          const label = formatMealCardDayLabel(cell.nightDate);
          return (
            <button
              key={cell.mealId}
              type="button"
              data-slot="week-strip-cell"
              data-meal-id={cell.mealId}
              data-today={today ? "true" : "false"}
              data-past={past ? "true" : "false"}
              data-selected={selected ? "true" : "false"}
              aria-pressed={selected}
              aria-current={today ? "date" : undefined}
              aria-label={past ? `${label}, read only` : label}
              onClick={() => onSelect(cell.mealId)}
              className={cn(
                "flex min-h-[44px] min-w-[44px] flex-1 basis-0 shrink-0 flex-col items-center justify-center rounded-[12px] px-0.5 py-1",
                today && "bg-primary text-primary-foreground",
                !today && past && "text-muted-foreground",
                !today && past && selected && "bg-muted",
                !today && !past && selected && "bg-primary/15 text-primary",
                !today && !past && !selected && "text-foreground",
              )}
            >
              <span className="text-[11px] font-semibold leading-none">{cell.letter}</span>
              <span className="mt-1 text-sm font-semibold leading-none">{cell.day}</span>
              <span className="mt-0.5 h-3 text-[10px] font-semibold leading-3 opacity-80">
                {cell.month ?? "\u00a0"}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
