"use client";

import { use } from "react";
import { AppShell } from "@/components/app-shell";
import { AuthGate } from "@/components/auth-gate";
import { PastWeekDetail } from "@/components/past-weeks";
import { useSupper } from "@/components/supper-provider";
import { formatWeekRange } from "@/lib/dates";
import { PAST_WEEKS_EMPTY, PAST_WEEKS_LABEL } from "@/lib/meal-history";

export default function PastWeekPage({ params }: { params: Promise<{ startsOn: string }> }) {
  const { startsOn } = use(params);
  return (
    <AuthGate>
      <PastWeekBody startsOn={startsOn} />
    </AuthGate>
  );
}

function PastWeekBody({ startsOn }: { startsOn: string }) {
  const { snapshot } = useSupper();
  if (!snapshot) {
    return (
      <AppShell title={PAST_WEEKS_LABEL} backHref="/settings/history" backLabel={PAST_WEEKS_LABEL}>
        <p className="type-body text-muted-foreground">Create or join a household first.</p>
      </AppShell>
    );
  }

  const week = snapshot.mealHistory.find((item) => item.startsOn === startsOn);
  if (!week) {
    return (
      <AppShell title={PAST_WEEKS_LABEL} backHref="/settings/history" backLabel={PAST_WEEKS_LABEL}>
        <p data-slot="past-weeks-empty" className="type-body text-muted-foreground">
          {PAST_WEEKS_EMPTY}
        </p>
      </AppShell>
    );
  }

  return (
    <AppShell
      title={formatWeekRange(week.startsOn)}
      backHref="/settings/history"
      backLabel={PAST_WEEKS_LABEL}
    >
      <PastWeekDetail week={week} />
    </AppShell>
  );
}
