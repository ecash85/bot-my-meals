"use client";

import type { ReactNode } from "react";
import { Minus, Plus } from "lucide-react";
import { HouseCard } from "@/components/house-card";
import { WEEKDAY_LABELS } from "@/lib/dates";
import {
  MAX_HEADCOUNT,
  MIN_NIGHT_HEADCOUNT,
  clampNightHeadcount,
  coupleNightsFromHeadcounts,
  nightKindLabel,
  normalizeNightHeadcounts,
} from "@/lib/headcount";
import type { Household, HouseholdSettingsPatch } from "@/lib/types";
import { cn } from "@/lib/utils";

export function PeoplePerNight({
  household,
  canEdit,
  onChange,
  title = "People per night",
  helper = "How many plates that night. Zero is an off night — no dinner planned.",
  compactOffNights = false,
  className,
  note,
  lockedWeekdays = [],
  children,
}: {
  household: Household;
  canEdit: boolean;
  onChange: (patch: HouseholdSettingsPatch) => void;
  title?: string;
  helper?: string;
  compactOffNights?: boolean;
  className?: string;
  /** Extra line under the helper. House uses this for new-week defaults. */
  note?: string;
  /** Weekdays that stay fixed after a mid-week unlock. */
  lockedWeekdays?: readonly number[];
  children?: ReactNode;
}) {
  const counts = normalizeNightHeadcounts(household.nightHeadcounts, household);
  const nights = WEEKDAY_LABELS.map((label, weekday) => ({
    label,
    weekday,
    count: counts[weekday],
  }));
  const visibleNights = compactOffNights ? nights.filter((night) => night.count > 0) : nights;

  const persistNights = (next: number[]) => {
    const nightHeadcounts = next.map(clampNightHeadcount);
    onChange({
      nightHeadcounts,
      coupleNights: coupleNightsFromHeadcounts(nightHeadcounts),
    });
  };

  const locked = new Set(lockedWeekdays);

  const setNight = (weekday: number, value: number) => {
    if (locked.has(weekday)) return;
    const next = [...counts];
    next[weekday] = clampNightHeadcount(value);
    persistNights(next);
  };

  const renderStepper = (label: string, weekday: number) => (
    <CountStepper
      key={label}
      day={weekday}
      label={label}
      hint={nightKindLabel(counts[weekday])}
      value={counts[weekday]}
      min={MIN_NIGHT_HEADCOUNT}
      max={MAX_HEADCOUNT}
      canEdit={canEdit}
      frozen={locked.has(weekday)}
      onChange={(value) => setNight(weekday, value)}
    />
  );

  return (
    <HouseCard className={cn("mt-6", className)}>
      <h2 className="type-section text-primary">{title}</h2>
      <p className="type-meta mt-1 text-muted-foreground">{helper}</p>
      {note ? (
        <p data-slot="people-per-night-note" className="type-meta mt-2 text-muted-foreground">
          {note}
        </p>
      ) : null}
      <ul data-slot="people-per-night" className="mt-4 space-y-2">
        {visibleNights.map((night) => renderStepper(night.label, night.weekday))}
      </ul>
      {children}
    </HouseCard>
  );
}

function CountStepper({
  day,
  label,
  hint,
  value,
  min,
  max,
  canEdit,
  frozen = false,
  onChange,
}: {
  day: number;
  label: string;
  hint: string;
  value: number;
  min: number;
  max: number;
  canEdit: boolean;
  frozen?: boolean;
  onChange: (value: number) => void;
}) {
  const editable = canEdit && !frozen;
  return (
    <li
      data-slot="night-stepper"
      data-day={day}
      data-frozen={frozen ? "true" : "false"}
      className="flex min-h-12 items-center justify-between gap-3 rounded-[14px] bg-secondary px-3 py-2"
    >
      <div>
        <p className="type-body font-semibold">{label}</p>
        <p className="type-meta text-muted-foreground">{hint}</p>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={`Fewer people on ${label}`}
          disabled={!editable || value <= min}
          onClick={() => onChange(value - 1)}
          className="tap-target flex size-12 items-center justify-center rounded-[var(--radius-button)] bg-card text-foreground shadow-card disabled:opacity-40"
        >
          <Minus className="size-5" />
        </button>
        <input
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          disabled={!editable}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          aria-label={`People on ${label}`}
          className="h-12 w-14 rounded-[var(--radius-button)] border border-border bg-card text-center font-mono text-lg font-semibold tabular-nums"
        />
        <button
          type="button"
          aria-label={`More people on ${label}`}
          disabled={!editable || value >= max}
          onClick={() => onChange(value + 1)}
          className="tap-target flex size-12 items-center justify-center rounded-[var(--radius-button)] bg-card text-foreground shadow-card disabled:opacity-40"
        >
          <Plus className="size-5" />
        </button>
      </div>
    </li>
  );
}
