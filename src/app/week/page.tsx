"use client";

import { Suspense, useCallback, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { AuthGate } from "@/components/auth-gate";
import { BallotCard } from "@/components/ballot-card";
import { BallotToast } from "@/components/ballot-toast";
import { EmptyDayCard } from "@/components/empty-day-card";
import { InstallPrompt } from "@/components/install-prompt";
import { LockBar } from "@/components/lock-bar";
import { Onboarding } from "@/components/onboarding";
import { SetupWizard } from "@/components/setup-wizard";
import { useSupper } from "@/components/supper-provider";
import { isHouseSetupComplete, shouldShowHouseSetup } from "@/lib/house-setup";
import { isAdmin } from "@/lib/users";
import { Button } from "@/components/ui/button";
import {
  EMPTY_WEEK_WAITING_TITLE,
  emptyWeekPresentation,
  isMutedBallotNight,
  weekNightPresentation,
  type EmptyWeekAction,
} from "@/lib/ballot";
import { formatWeekRange, weekdayLabelFromNight, weekdayShortFromNight } from "@/lib/dates";
import { canActOnBallot, checkWeekLock, latestVoteForMeal, nightLifecycle } from "@/lib/lock";
import { recipeNightsForWeek } from "@/lib/recipes";
import type { VoteChoice } from "@/lib/types";

export default function WeekPage() {
  return (
    <AuthGate>
      <Suspense>
        <WeekBody />
      </Suspense>
    </AuthGate>
  );
}

function WeekBody() {
  const { snapshot, session } = useSupper();
  const searchParams = useSearchParams();
  const setupRequested = searchParams.get("setup") === "1";

  if (!snapshot) return <Onboarding />;
  if (setupRequested && shouldShowHouseSetup(session?.role, snapshot.household.setupStep)) {
    return <SetupWizard />;
  }
  return <WeekBallot />;
}

function WeekBallot() {
  const { session, snapshot, setVote, requestWeekBallot } = useSupper();
  const [toast, setToast] = useState<string | undefined>();
  const dismissToast = useCallback(() => setToast(undefined), []);
  if (!snapshot) return null;

  const locked = snapshot.week.status === "locked";
  const check = checkWeekLock(snapshot.meals, snapshot.votes, snapshot.memberships);
  const canVote = Boolean(session?.membershipId) && canActOnBallot(session?.role) && !locked;
  const nights = recipeNightsForWeek(snapshot.meals);

  const act = async (mealId: string, choice: VoteChoice, note?: string) => {
    const message = await setVote(mealId, choice, note);
    if (message) setToast(message);
  };

  return (
    <AppShell
      title="This week"
      eyebrow={formatWeekRange(snapshot.week.startsOn)}
      status={undefined}
      footer={!locked && check.ready ? <LockBar /> : undefined}
    >
      <InstallPrompt />
      {locked ? <div className="mb-4"><LockBar /></div> : null}
      {nights.length === 0 ? (
        <EmptyWeek onCreateMeals={() => requestWeekBallot()} />
      ) : (
        <div className="space-y-3">
          {nights.map((meal) => {
            const weekday = weekdayShortFromNight(meal.nightDate);
            const dayName = weekdayLabelFromNight(meal.nightDate);
            const latest = latestVoteForMeal(snapshot.votes, meal.id, snapshot.memberships);
            const lifecycle = nightLifecycle(meal, snapshot.votes, snapshot.memberships);
            const presentation = weekNightPresentation(lifecycle, locked);

            switch (presentation) {
              case "empty":
                return (
                  <EmptyDayCard
                    key={meal.id}
                    dayLabel={weekday}
                    dayName={dayName}
                    state="empty"
                    onAdd={canVote ? (note) => act(meal.id, "request_new_meal", note) : undefined}
                  />
                );
              case "pending_add":
                return (
                  <EmptyDayCard
                    key={meal.id}
                    dayLabel={weekday}
                    dayName={dayName}
                    state="pending"
                    note={latest?.note}
                    onCancel={canVote ? () => act(meal.id, "remove") : undefined}
                  />
                );
              case "locked_empty":
                return (
                  <EmptyDayCard
                    key={meal.id}
                    dayLabel={weekday}
                    dayName={dayName}
                    state="locked"
                  />
                );
              case "ballot":
                return (
                  <BallotCard
                    key={meal.id}
                    dayLabel={weekday}
                    confirmDayLabel={dayName}
                    title={meal.title}
                    pitch={meal.pitch}
                    servings={meal.servings}
                    swapped={lifecycle === "swapped"}
                    swapNote={latest?.note}
                    muted={isMutedBallotNight({
                      isLeftovers: meal.isLeftovers,
                      isNightOff: false,
                    })}
                    locked={locked}
                    onSwap={canVote ? (reason) => act(meal.id, "swap", reason) : undefined}
                    onRemove={canVote ? () => act(meal.id, "remove") : undefined}
                  />
                );
              default: {
                const _exhaustive: never = presentation;
                return _exhaustive;
              }
            }
          })}
        </div>
      )}
      <BallotToast message={toast} onDismiss={dismissToast} />
    </AppShell>
  );
}

function emptyWeekCta(
  action: EmptyWeekAction,
  cta: string,
  creating: boolean,
  onCreate: () => Promise<void>,
) {
  switch (action) {
    case "finish-setup":
      return (
        <Button asChild size="fat" variant="primary" className="mt-4 w-full">
          <Link href="/week?setup=1">{cta}</Link>
        </Button>
      );
    case "create-meals":
      return (
        <Button
          type="button"
          size="fat"
          variant="primary"
          className="mt-4 w-full"
          disabled={creating}
          aria-label={creating ? "Saving" : cta}
          aria-busy={creating}
          onClick={() => void onCreate()}
        >
          {creating ? "Saving…" : cta}
        </Button>
      );
    case "waiting":
      return (
        <p data-slot="waiting-for-bot" className="type-meta mt-4 text-primary">
          {EMPTY_WEEK_WAITING_TITLE}
        </p>
      );
    default: {
      const _exhaustive: never = action;
      return _exhaustive;
    }
  }
}

function EmptyWeek({ onCreateMeals }: { onCreateMeals: () => Promise<string> }) {
  const { session, snapshot } = useSupper();
  const [creating, setCreating] = useState(false);
  const setupIncomplete = !isHouseSetupComplete(snapshot?.household.setupStep ?? 8);
  const copy = emptyWeekPresentation({
    setupIncomplete,
    ballotStatus: snapshot?.ballotRequest?.status ?? null,
    canCreate: isAdmin(session?.role),
  });

  return (
    <div
      data-slot="empty-week"
      className="rounded-[14px] border border-dashed border-border bg-card p-6 text-center shadow-card"
    >
      <h2 className="type-section">{copy.title}</h2>
      <p className="type-body mt-2 text-muted-foreground">{copy.helper}</p>
      {emptyWeekCta(copy.action, copy.cta, creating, async () => {
        setCreating(true);
        try {
          await onCreateMeals();
        } finally {
          setCreating(false);
        }
      })}
    </div>
  );
}
