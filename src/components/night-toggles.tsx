"use client";

import { WEEKDAY_LABELS } from "@/lib/dates";
import { Switch } from "@/components/ui/switch";

export function NightToggles({
  nightsOn,
  canEdit,
  onChange,
}: {
  nightsOn: boolean[];
  canEdit: boolean;
  onChange: (nightsOn: boolean[]) => void;
}) {
  const onCount = nightsOn.filter(Boolean).length;

  const toggle = (weekday: number) => {
    if (!canEdit) return;
    const next = nightsOn.map((on, index) => (index === weekday ? !on : on));
    if (!next.some(Boolean)) return;
    onChange(next);
  };

  return (
    <ul data-slot="night-toggles" className="mt-4 space-y-2">
      {WEEKDAY_LABELS.map((label, weekday) => {
        const on = nightsOn[weekday] === true;
        const lastOn = on && onCount <= 1;
        return (
          <li key={label}>
            <button
              type="button"
              data-slot="night-toggle"
              data-day={weekday}
              aria-pressed={on}
              aria-label={`${label} dinner`}
              disabled={!canEdit || lastOn}
              onClick={() => toggle(weekday)}
              className="flex min-h-12 w-full items-center justify-between gap-3 rounded-[14px] bg-secondary px-3 py-2 text-left disabled:opacity-40"
            >
              <span className="type-body font-semibold">{label}</span>
              <Switch
                checked={on}
                tabIndex={-1}
                aria-hidden
                className="pointer-events-none h-7 w-12 data-[size=default]:h-7 data-[size=default]:w-12"
              />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
