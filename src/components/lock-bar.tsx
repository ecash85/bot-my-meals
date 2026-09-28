"use client";

import { useState } from "react";
import { Loader2, Lock } from "lucide-react";
import { useSupper } from "@/components/supper-provider";
import { useViewedWeek } from "@/components/use-viewed-week";
import { Button } from "@/components/ui/button";
import { checkWeekLock } from "@/lib/lock";

export function LockBar() {
  const { snapshot, lockWeek, error } = useSupper();
  const { scope } = useViewedWeek();
  const [busy, setBusy] = useState(false);
  if (!snapshot || !scope) return null;

  const locked = scope.week.status === "locked";
  const check = checkWeekLock(scope.meals, scope.votes, snapshot.memberships);
  if (locked || !check.ready) return null;

  return (
    <div data-slot="lock-bar" data-state="ready" className="rounded-[14px] bg-card p-3 shadow-card">
      <Button
        size="fat"
        variant="primary"
        className="w-full gap-2 shadow-float"
        disabled={busy}
        aria-busy={busy}
        onClick={() => {
          setBusy(true);
          void lockWeek()
            .catch(() => undefined)
            .finally(() => setBusy(false));
        }}
      >
        {busy ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <Lock className="size-5" />}
        {busy ? "Locking…" : "Lock this week"}
      </Button>
      {error ? <p className="type-meta mt-2 text-destructive">{error}</p> : null}
    </div>
  );
}
