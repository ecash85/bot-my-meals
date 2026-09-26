"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { HouseCard } from "@/components/house-card";
import { useTheme } from "@/components/theme-provider";
import { THEME_PREFERENCE_OPTIONS } from "@/lib/appearance";
import { cn } from "@/lib/utils";

const ICONS = {
  device: Monitor,
  light: Sun,
  dark: Moon,
} as const;

export function AppearancePicker() {
  const { preference, setPreference } = useTheme();

  return (
    <HouseCard className="mt-6" data-slot="appearance-picker">
      <h2 className="type-section text-primary">Appearance</h2>
      <p className="type-meta mt-1 text-muted-foreground">
        Follow this device, or keep Light or Dark.
      </p>
      <div
        role="radiogroup"
        aria-label="Appearance"
        className="mt-3 grid grid-cols-3 gap-2"
      >
        {THEME_PREFERENCE_OPTIONS.map((option) => {
          const selected = preference === option.value;
          const Icon = ICONS[option.value];
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={option.label}
              data-appearance={option.value}
              data-selected={selected ? "true" : "false"}
              suppressHydrationWarning
              className={cn(
                "tap-target flex min-h-12 flex-col items-center justify-center gap-1 rounded-[var(--radius-button)] px-2 text-sm font-semibold",
                selected
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground",
              )}
              onClick={() => setPreference(option.value)}
            >
              <Icon className="size-4" aria-hidden="true" />
              {option.label}
            </button>
          );
        })}
      </div>
    </HouseCard>
  );
}
