"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  WAKE_ASKED_MESSAGE,
  WAKE_COOLDOWN_MS,
  WAKE_MESSAGE_CONTINUE,
  wakeControlLabel,
  type WakePhase,
} from "@/lib/wake-feedback";

export function WakePhaseButton({
  phase,
  idleLabel,
  wakingLabel,
  onWake,
  className,
  slot,
}: {
  phase: WakePhase;
  idleLabel: string;
  wakingLabel: string;
  onWake: () => void;
  className?: string;
  slot?: string;
}) {
  const label = wakeControlLabel(phase, idleLabel, wakingLabel);
  return (
    <Button
      type="button"
      variant="secondary"
      size="fat"
      className={className}
      disabled={phase !== "idle"}
      aria-busy={phase === "waking"}
      data-wake-phase={phase}
      data-slot={slot}
      onClick={() => {
        if (phase !== "idle") return;
        onWake();
      }}
    >
      {phase === "waking" ? <Loader2 className="size-5 animate-spin" aria-hidden /> : null}
      {label}
    </Button>
  );
}

/** No webhook: the tap only asks them to message the bot. It does not claim a wake. */
export function OfflineAskButton({
  idleLabel,
  className,
}: {
  idleLabel: string;
  className?: string;
}) {
  const [cooling, setCooling] = useState(false);
  const [asked, setAsked] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current != null) window.clearTimeout(timer.current);
    };
  }, []);

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        size="fat"
        className={className}
        disabled={cooling}
        data-wake-phase={cooling ? "cooldown" : "idle"}
        onClick={() => {
          if (cooling) return;
          setAsked(true);
          setCooling(true);
          if (timer.current != null) window.clearTimeout(timer.current);
          timer.current = window.setTimeout(() => {
            timer.current = null;
            setCooling(false);
          }, WAKE_COOLDOWN_MS);
        }}
      >
        {cooling ? WAKE_MESSAGE_CONTINUE : idleLabel}
      </Button>
      {asked ? (
        <p data-slot="wake-asked" className="type-meta mt-2 text-foreground">
          {WAKE_ASKED_MESSAGE}
        </p>
      ) : null}
    </>
  );
}
