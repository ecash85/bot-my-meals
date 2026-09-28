"use client";

import { formatMealCardDayLabel } from "@/lib/dates";
import { weekStripCells, type WeekStripCell, type WeekStripNight } from "@/lib/week-strip";
import { cn } from "@/lib/utils";

const cellGeometry =
  "relative flex h-[44px] min-h-[44px] min-w-[44px] flex-1 basis-0 shrink-0 flex-col items-center justify-start gap-0.5 rounded-[12px] px-0.5 pt-0.5 leading-none";

export function WeekStrip({
  startsOn,
  nights,
  selectedMealId,
  todayIso,
  locked = false,
  mutedDates = [],
  onSelect,
}: {
  startsOn: string;
  nights: readonly WeekStripNight[];
  selectedMealId: string | null;
  todayIso: string;
  locked?: boolean;
  mutedDates?: readonly string[];
  onSelect: (mealId: string) => void;
}) {
  const cells = weekStripCells(startsOn, nights);
  const muted = new Set(mutedDates);

  return (
    <div
      data-slot="week-strip"
      data-locked={locked ? "true" : "false"}
      className="-mx-4 overflow-x-auto px-px py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      <div role="group" aria-label="Jump to a night" className="flex w-max min-w-full gap-2">
        {cells.map((cell) => {
          if (!cell.hasMeal || !cell.mealId) {
            return <EmptyStripCell key={cell.nightDate} cell={cell} />;
          }
          return (
            <MealStripCell
              key={cell.nightDate}
              cell={cell}
              mealId={cell.mealId}
              selected={cell.mealId === selectedMealId}
              today={cell.nightDate === todayIso}
              past={muted.has(cell.nightDate)}
              onSelect={onSelect}
            />
          );
        })}
      </div>
    </div>
  );
}

function EmptyStripCell({ cell }: { cell: WeekStripCell }) {
  return (
    <div
      data-slot="week-strip-cell"
      data-selectable="false"
      data-empty="true"
      data-today="false"
      data-past="false"
      data-selected="false"
      className={cn(cellGeometry, "text-muted-foreground/60")}
    >
      <StripCellFace cell={cell} emphasis={false} />
    </div>
  );
}

function MealStripCell({
  cell,
  mealId,
  selected,
  today,
  past,
  onSelect,
}: {
  cell: WeekStripCell;
  mealId: string;
  selected: boolean;
  today: boolean;
  past: boolean;
  onSelect: (mealId: string) => void;
}) {
  const label = formatMealCardDayLabel(cell.nightDate);
  return (
    <button
      type="button"
      data-slot="week-strip-cell"
      data-selectable="true"
      data-empty="false"
      data-meal-id={mealId}
      data-today={today ? "true" : "false"}
      data-past={past ? "true" : "false"}
      data-selected={selected ? "true" : "false"}
      aria-pressed={selected}
      aria-current={today ? "date" : undefined}
      aria-label={past ? `${label}, read only` : label}
      onClick={() => onSelect(mealId)}
      className={cn(
        cellGeometry,
        "cursor-pointer text-foreground",
        today && "bg-primary text-primary-foreground",
        !today && past && "text-muted-foreground",
        !today && past && selected && "bg-muted",
        !today && !past && selected && "bg-primary/15 text-primary",
      )}
    >
      <StripCellFace cell={cell} emphasis />
    </button>
  );
}

function StripCellFace({ cell, emphasis }: { cell: WeekStripCell; emphasis: boolean }) {
  const weight = emphasis ? "font-semibold" : "font-medium";
  return (
    <>
      <span className={cn("text-[11px] leading-none", weight)}>{cell.letter}</span>
      <span className={cn("text-sm leading-none", weight)}>{cell.day}</span>
      {cell.month ? (
        <span
          className={cn(
            "absolute inset-x-0 bottom-0.5 text-center text-[10px] leading-none",
            weight,
            emphasis && "opacity-80",
          )}
        >
          {cell.month}
        </span>
      ) : null}
    </>
  );
}
