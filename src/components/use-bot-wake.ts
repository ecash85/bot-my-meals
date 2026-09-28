"use client";

import { useCallback, useEffect, useState } from "react";
import { BOT_WAKE_SOFT_FAIL } from "@/lib/bot-wake";
import { fetchBotWakeConfigured, requestBotWake, type WakeClientResult } from "@/lib/bot-wake-client";

export const BOT_WAKE_CONFIGURED_EVENT = "bot-wake-configured";

/**
 * Null until GET /api/bot/wake answers. Callers that show hour cadence must
 * wait for false — unknown is not a license to advertise the poll.
 */
export function useBotWakeConfigured(override?: boolean): boolean | null {
  const [configured, setConfigured] = useState<boolean | null>(override ?? null);

  useEffect(() => {
    if (override !== undefined) return;
    let cancelled = false;
    void fetchBotWakeConfigured().then((value) => {
      if (!cancelled) setConfigured(value);
    });
    const onSaved = () => setConfigured(true);
    window.addEventListener(BOT_WAKE_CONFIGURED_EVENT, onSaved);
    return () => {
      cancelled = true;
      window.removeEventListener(BOT_WAKE_CONFIGURED_EVENT, onSaved);
    };
  }, [override]);

  return override ?? configured;
}

export function markBotWakeConfigured(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(BOT_WAKE_CONFIGURED_EVENT));
}

export function useWakeNow(onWake?: () => void | Promise<WakeClientResult | void>) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | undefined>();
  const dismiss = useCallback(() => setMessage(undefined), []);

  const wake = () => {
    if (busy) return;
    setBusy(true);
    const run = onWake ?? (() => requestBotWake("check_now"));
    void Promise.resolve(run())
      .then((result) => {
        if (result === "failed") setMessage(BOT_WAKE_SOFT_FAIL);
      })
      .catch(() => setMessage(BOT_WAKE_SOFT_FAIL))
      .finally(() => setBusy(false));
  };

  return { busy, message, dismiss, wake };
}
