"use client";

import { formatWeekRange } from "@/lib/dates";
import { NEXT_WEEK_LABEL, THIS_WEEK_LABEL } from "@/lib/open-weeks";
import type { WeekRole } from "@/lib/types";
import { cn } from "@/lib/utils";

export function WeekSwitcher({
  role,
  cookingStartsOn,
  planningStartsOn,
  onSelect,
}: {
  role: WeekRole;
  cookingStartsOn: string;
  planningStartsOn: string;
  onSelect: (role: WeekRole) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Week"
      data-slot="week-switcher"
      className="mt-3 grid grid-cols-2 gap-2"
    >
      <WeekChip
        label={THIS_WEEK_LABEL}
        range={formatWeekRange(cookingStartsOn)}
        active={role === "cooking"}
        onSelect={() => onSelect("cooking")}
      />
      <WeekChip
        label={NEXT_WEEK_LABEL}
        range={formatWeekRange(planningStartsOn)}
        active={role === "planning"}
        onSelect={() => onSelect("planning")}
      />
    </div>
  );
}

function WeekChip({
  label,
  range,
  active,
  onSelect,
}: {
  label: string;
  range: string;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      data-week-chip={label === THIS_WEEK_LABEL ? "cooking" : "planning"}
      className={cn(
        "min-h-11 rounded-[12px] px-3 py-2 text-left",
        active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
      )}
      onClick={onSelect}
    >
      <span className="block text-base font-semibold leading-5">{label}</span>
      {active ? <span className="mt-0.5 block text-[13px] leading-[18px] opacity-80">{range}</span> : null}
    </button>
  );
}
