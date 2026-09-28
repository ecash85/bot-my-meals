"use client";

import { useState } from "react";
import { BallotToast } from "@/components/ballot-toast";
import { HouseCard } from "@/components/house-card";
import { useBotWakeConfigured, useWakeNow } from "@/components/use-bot-wake";
import { Button } from "@/components/ui/button";
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
import { BOT_CHECK_NOW_WAKE_HINT } from "@/lib/bot-wake";
import type { WakeClientResult } from "@/lib/bot-wake-client";
import type { BotCheckIntervalHours, BotCheckMode, HouseholdSettingsPatch } from "@/lib/types";
import { cn } from "@/lib/utils";

export function BotCheckNow({
  className,
  wakeConfigured,
  onCheckNow,
  hint: hintOverride,
  wakeHint,
}: {
  className?: string;
  wakeConfigured?: boolean;
  onCheckNow?: () => void | Promise<WakeClientResult | void>;
  hint?: string;
  wakeHint?: string;
}) {
  const configured = useBotWakeConfigured(wakeConfigured) === true;
  const { busy, message, dismiss, wake } = useWakeNow(onCheckNow);
  const hint = configured ? (wakeHint ?? BOT_CHECK_NOW_WAKE_HINT) : (hintOverride ?? BOT_CHECK_NOW_HINT);

  return (
    <div data-slot="bot-check-now" data-wake={configured ? "on" : "off"} className={cn("mt-4", className)}>
      {configured ? (
        <Button
          type="button"
          variant="secondary"
          size="fat"
          className="w-full"
          disabled={busy}
          aria-busy={busy}
          onClick={wake}
        >
          {BOT_CHECK_NOW_LABEL}
        </Button>
      ) : (
        <p className="type-body font-semibold">{BOT_CHECK_NOW_LABEL}</p>
      )}
      <p className="type-meta mt-1 text-muted-foreground">{hint}</p>
      <BallotToast message={message} onDismiss={dismiss} />
    </div>
  );
}

export function WaitingBotCheck({
  status,
  pendingWorkOnly = false,
  checkNowWhenIdle = false,
  className,
  checkNowHint,
  checkNowWakeHint,
  wakeConfigured,
}: {
  status: BotCheckStatus;
  pendingWorkOnly?: boolean;
  checkNowWhenIdle?: boolean;
  className?: string;
  checkNowHint?: string;
  checkNowWakeHint?: string;
  wakeConfigured?: boolean;
}) {
  const configured = useBotWakeConfigured(wakeConfigured);
  const raw = waitingCadenceLine(status, { pendingWorkOnly });
  const line = configured === false ? raw : null;
  if (!raw && !checkNowWhenIdle) return null;
  return (
    <div data-slot="bot-check-waiting" className={className}>
      {line ? (
        <p data-slot="bot-check-cadence" className="type-meta text-muted-foreground">
          {line}
        </p>
      ) : null}
      <BotCheckNow hint={checkNowHint} wakeHint={checkNowWakeHint} wakeConfigured={wakeConfigured} />
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
    <HouseCard id="bot-check" className="mt-6 scroll-mt-24" data-slot="bot-check-frequency">
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
