"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BOT_WAKE_SOFT_FAIL } from "@/lib/bot-wake";
import { fetchBotWakeConfigured, requestBotWake, type WakeClientResult } from "@/lib/bot-wake-client";
import { WAKE_COOLDOWN_MS, wakeSettledPhase, type WakePhase } from "@/lib/wake-feedback";

export const BOT_WAKE_CONFIGURED_EVENT = "bot-wake-configured";
export const PENDING_REFRESH_EVENT = "bot-pending-refresh";
export const BOT_WAKE_NOTIFIED_EVENT = "bot-wake-notified";

/**
 * Null until GET /api/bot/wake answers. Unknown is not configured.
 * Create stays off until this is true.
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

export function requestPendingRefresh(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(PENDING_REFRESH_EVENT));
}

export function markBotWakeNotified(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(BOT_WAKE_NOTIFIED_EVENT));
}

/** True after a wake POST succeeded in this mount, including a Save that flipped needs_work. */
export function useBotJustNotified(): boolean {
  const [notified, setNotified] = useState(false);
  useEffect(() => {
    const onNotified = () => setNotified(true);
    window.addEventListener(BOT_WAKE_NOTIFIED_EVENT, onNotified);
    return () => window.removeEventListener(BOT_WAKE_NOTIFIED_EVENT, onNotified);
  }, []);
  return notified;
}

export function useWakeNow(onWake?: () => void | Promise<WakeClientResult | void>) {
  const [phase, setPhase] = useState<WakePhase>("idle");
  const [notified, setNotified] = useState(false);
  const [message, setMessage] = useState<string | undefined>();
  const phaseRef = useRef<WakePhase>("idle");
  const timer = useRef<number | null>(null);
  const dismiss = useCallback(() => setMessage(undefined), []);

  useEffect(() => {
    return () => {
      if (timer.current != null) window.clearTimeout(timer.current);
    };
  }, []);

  const settle = (next: WakePhase) => {
    phaseRef.current = next;
    setPhase(next);
  };

  const wake = () => {
    if (phaseRef.current !== "idle") return;
    settle("waking");
    const run = onWake ?? (() => requestBotWake("check_now"));
    void Promise.resolve(run())
      .then((result) => {
        if (result === "failed") setMessage(BOT_WAKE_SOFT_FAIL);
        const next = wakeSettledPhase(result);
        if (next === "cooldown") {
          setNotified(true);
          markBotWakeNotified();
          requestPendingRefresh();
          settle("cooldown");
          if (timer.current != null) window.clearTimeout(timer.current);
          timer.current = window.setTimeout(() => {
            timer.current = null;
            settle("idle");
          }, WAKE_COOLDOWN_MS);
          return;
        }
        settle("idle");
      })
      .catch(() => {
        setMessage(BOT_WAKE_SOFT_FAIL);
        settle("idle");
      });
  };

  return {
    phase,
    busy: phase === "waking",
    held: phase !== "idle",
    notified,
    message,
    dismiss,
    wake,
  };
}
