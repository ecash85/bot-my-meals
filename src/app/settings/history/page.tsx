"use client";

import { AppShell } from "@/components/app-shell";
import { AuthGate } from "@/components/auth-gate";
import { PastWeeksList } from "@/components/past-weeks";
import { useSupper } from "@/components/supper-provider";
import { PAST_WEEKS_LABEL } from "@/lib/meal-history";

export default function PastWeeksPage() {
  return (
    <AuthGate>
      <PastWeeksBody />
    </AuthGate>
  );
}

function PastWeeksBody() {
  const { snapshot } = useSupper();
  if (!snapshot) {
    return (
      <AppShell title={PAST_WEEKS_LABEL} backHref="/settings" backLabel="House">
        <p className="type-body text-muted-foreground">Create or join a household first.</p>
      </AppShell>
    );
  }

  return (
    <AppShell title={PAST_WEEKS_LABEL} backHref="/settings" backLabel="House">
      <PastWeeksList weeks={snapshot.mealHistory} />
    </AppShell>
  );
}
