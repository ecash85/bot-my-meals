"use client";

import { BallotToast } from "@/components/ballot-toast";
import { useBotWakeConfigured, useWakeNow } from "@/components/use-bot-wake";
import { OfflineAskButton, WakePhaseButton } from "@/components/wake-button";
import {
  BOT_CHECK_NOW_HINT,
  BOT_CHECK_NOW_LABEL,
  type BotCheckStatus,
} from "@/lib/bot-check";
import { BOT_CHECK_NOW_WAKE_HINT } from "@/lib/bot-wake";
import type { WakeClientResult } from "@/lib/bot-wake-client";
import { WAKE_CHECKING_LABEL, WAKE_MEALS_NOTIFIED } from "@/lib/wake-feedback";
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
  const configured = useBotWakeConfigured(wakeConfigured);
  const wakeOn = configured === true;
  const { phase, notified, message, dismiss, wake } = useWakeNow(onCheckNow);
  const hint =
    configured === true
      ? (wakeHint ?? BOT_CHECK_NOW_WAKE_HINT)
      : configured === false
        ? (hintOverride ?? BOT_CHECK_NOW_HINT)
        : null;

  return (
    <div data-slot="bot-check-now" data-wake={wakeOn ? "on" : "off"} className={cn("mt-4", className)}>
      {wakeOn ? (
        <WakePhaseButton
          phase={phase}
          idleLabel={BOT_CHECK_NOW_LABEL}
          wakingLabel={WAKE_CHECKING_LABEL}
          onWake={wake}
          className="w-full"
        />
      ) : configured === false ? (
        <OfflineAskButton idleLabel={BOT_CHECK_NOW_LABEL} className="w-full" />
      ) : (
        <p className="type-body font-semibold">{BOT_CHECK_NOW_LABEL}</p>
      )}
      {wakeOn && notified ? (
        <p data-slot="wake-notified" className="type-meta mt-2 text-foreground">
          {WAKE_MEALS_NOTIFIED}
        </p>
      ) : null}
      {hint ? <p className="type-meta mt-1 text-muted-foreground">{hint}</p> : null}
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
  if (status.cadence.phase !== "active" && !checkNowWhenIdle) return null;
  if (pendingWorkOnly && !status.needs_work && !checkNowWhenIdle) return null;
  return (
    <div data-slot="bot-check-waiting" className={className}>
      <BotCheckNow hint={checkNowHint} wakeHint={checkNowWakeHint} wakeConfigured={wakeConfigured} />
    </div>
  );
}
