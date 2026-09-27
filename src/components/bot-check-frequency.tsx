"use client";

import { useState } from "react";
import { HouseCard } from "@/components/house-card";
import {
  BOT_CHECK_HELPER,
  BOT_CHECK_NOW_HINT,
  BOT_CHECK_NOW_LABEL,
  BOT_CHECK_OPTIONS,
  BOT_CHECK_SECTION_LABEL,
  botCheckChoiceFromSetting,
  botCheckSettingFromChoice,
  waitingCadenceLine,
  type BotCheckChoice,
  type BotCheckStatus,
} from "@/lib/bot-check";
import type { BotCheckIntervalHours, BotCheckMode, HouseholdSettingsPatch } from "@/lib/types";
import { cn } from "@/lib/utils";

export function BotCheckNow({ className }: { className?: string }) {
  return (
    <div data-slot="bot-check-now" className={cn("mt-4", className)}>
      <p className="type-body font-semibold">{BOT_CHECK_NOW_LABEL}</p>
      <p className="type-meta mt-1 text-muted-foreground">{BOT_CHECK_NOW_HINT}</p>
    </div>
  );
}

export function WaitingBotCheck({
  status,
  pendingWorkOnly = false,
  checkNowWhenIdle = false,
  className,
}: {
  status: BotCheckStatus;
  pendingWorkOnly?: boolean;
  checkNowWhenIdle?: boolean;
  className?: string;
}) {
  const line = waitingCadenceLine(status, { pendingWorkOnly });
  if (!line && !checkNowWhenIdle) return null;
  return (
    <div data-slot="bot-check-waiting" className={className}>
      {line ? (
        <p data-slot="bot-check-cadence" className="type-meta text-muted-foreground">
          {line}
        </p>
      ) : null}
      <BotCheckNow />
    </div>
  );
}

export function BotCheckFrequency({
  mode,
  intervalHours,
  canEdit,
  onChange,
}: {
  mode: BotCheckMode;
  intervalHours: BotCheckIntervalHours | null;
  canEdit: boolean;
  onChange: (patch: HouseholdSettingsPatch) => Promise<void>;
}) {
  const [error, setError] = useState<string | null>(null);
  const selected = botCheckChoiceFromSetting(mode, intervalHours);

  const choose = (choice: BotCheckChoice) => {
    if (!canEdit || choice === selected) return;
    setError(null);
    void onChange(botCheckSettingFromChoice(choice)).catch((err: unknown) => {
      setError(err instanceof Error ? err.message : "Could not save Bot check frequency.");
    });
  };

  return (
    <HouseCard className="mt-6" data-slot="bot-check-frequency">
      <h2 className="type-section text-primary">{BOT_CHECK_SECTION_LABEL}</h2>
      <p className="type-meta mt-1 text-muted-foreground">{BOT_CHECK_HELPER}</p>
      <div role="radiogroup" aria-label={BOT_CHECK_SECTION_LABEL} className="mt-3 space-y-2">
        {BOT_CHECK_OPTIONS.map((option) => {
          const isSelected = selected === option.choice;
          return (
            <button
              key={option.choice}
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={!canEdit}
              data-bot-check={option.choice}
              className={cn(
                "tap-target flex min-h-12 w-full flex-col items-start rounded-[var(--radius-button)] px-3 py-2 text-left",
                isSelected
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground",
              )}
              onClick={() => choose(option.choice)}
            >
              <span className="type-body font-semibold">{option.label}</span>
              {option.detail ? <span className="type-meta mt-0.5">{option.detail}</span> : null}
            </button>
          );
        })}
      </div>
      {error ? <p className="type-meta mt-2 text-destructive">{error}</p> : null}
      <BotCheckNow />
    </HouseCard>
  );
}
