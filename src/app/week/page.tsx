"use client";

import { Suspense, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { AuthGate } from "@/components/auth-gate";
import { BallotCard } from "@/components/ballot-card";
import { WaitingBotCheck } from "@/components/bot-check-frequency";
import { BallotToast } from "@/components/ballot-toast";
import { EmptyDayCard } from "@/components/empty-day-card";
import { InstallPrompt } from "@/components/install-prompt";
import { LockBar } from "@/components/lock-bar";
import { LockedNightFrame, PostLockWaitingCard, PostLockWaitingSheet } from "@/components/post-lock-waiting";
import { PastWeekDetail } from "@/components/past-weeks";
import { PlanningPeopleGate } from "@/components/planning-people-gate";
import { UnlockWeekControl } from "@/components/unlock-week-control";
import { WeekChrome } from "@/components/week-chrome";
import { Onboarding } from "@/components/onboarding";
import { SetupWizard } from "@/components/setup-wizard";
import { useSupper } from "@/components/supper-provider";
import { useViewedWeek } from "@/components/use-viewed-week";
import { isHouseSetupComplete, shouldShowHouseSetup } from "@/lib/house-setup";
import { isAdmin } from "@/lib/users";
import { Button } from "@/components/ui/button";
import {
  EMPTY_WEEK_WAITING_TITLE,
  emptyWeekPresentation,
  isMutedBallotNight,
  weekNightPresentation,
  type EmptyWeekAction,
  type WeekNightPresentation,
} from "@/lib/ballot";
import { botCheckForHousehold } from "@/lib/bot-check";
import { formatMealCardDayLabel, weekdayLabelFromNight } from "@/lib/dates";
import { PAST_WEEKS_LABEL, todayInTimeZone } from "@/lib/meal-history";
import {
  PLANNING_CREATE_ERROR,
  PLANNING_SWIPE_TOAST,
  planningPeopleGateOpen,
} from "@/lib/planning-people";
import {
  futureSwipeCreatesPlanning,
  navigatorEyebrow,
  navigatorHref,
  navigatorTitle,
  selectionFromStop,
  stepNavigator,
} from "@/lib/week-navigator";
import { isPendingBotFill, lockedDinnerTap, POST_LOCK_GET_RECIPES_NEXT_HINT, POST_LOCK_GET_RECIPES_NEXT_WAKE_HINT } from "@/lib/post-lock-waiting";
import { focusNightCard, nightCardAnchorId } from "@/lib/week-strip";
import { canActOnBallot, checkWeekLock, latestVoteForMeal, nightLifecycle } from "@/lib/lock";
import { recipeNightsForWeek } from "@/lib/recipes";
import {
  nightHasStripMeal,
  nightStaysLocked,
  showFirstMealRow,
  showOpenShoppingList,
  stripCellMuted,
  upcomingDinner,
} from "@/lib/week-chrome";
import type { Meal, NightLifecycle, VoteChoice } from "@/lib/types";

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
  const router = useRouter();
  const { session, snapshot, setVote, requestWeekBallot, planNextWeek, savePlanningPeople } = useSupper();
  const { role, scope, past, hasPlanning, stops, index, setViewedWeek } = useViewedWeek();
  const searchParams = useSearchParams();
  const [toast, setToast] = useState<string | undefined>();
  const [waitingOpen, setWaitingOpen] = useState(false);
  const [planning, setPlanning] = useState(false);
  const creatingPlanning = useRef(false);
  const [selectedNightId, setSelectedNightId] = useState<string | null>(null);
  const dismissToast = useCallback(() => setToast(undefined), []);
  const jumpToNight = useCallback((mealId: string) => {
    setSelectedNightId(mealId);
    focusNightCard(mealId, (id) => document.getElementById(id));
  }, []);
  const searchKey = searchParams.toString();
  const previousSearch = useRef<string | null>(null);
  useEffect(() => {
    if (!snapshot) return;
    const pastQuery = searchParams.get("past");
    const weekQuery = searchParams.get("week");
    const previous = previousSearch.current;
    previousSearch.current = searchKey;
    if (pastQuery && snapshot.mealHistory.some((week) => week.startsOn === pastQuery)) {
      setViewedWeek({ kind: "past", startsOn: pastQuery });
      return;
    }
    if (weekQuery === "next" && snapshot.planning) {
      setViewedWeek({ kind: "planning" });
      return;
    }
    if (weekQuery === "this") {
      setViewedWeek({ kind: "cooking" });
      return;
    }
    if (previous && previous.length > 0) setViewedWeek({ kind: "cooking" });
  }, [searchKey, searchParams, snapshot, setViewedWeek]);

  const startPlanning = useCallback(
    (announce: boolean) => {
      if (creatingPlanning.current) return;
      creatingPlanning.current = true;
      setPlanning(true);
      void planNextWeek()
        .then(() => {
          if (announce) setToast(PLANNING_SWIPE_TOAST);
          setViewedWeek({ kind: "planning" });
          router.replace(navigatorHref({ kind: "planning" }), { scroll: false });
        })
        .catch(() => setToast(PLANNING_CREATE_ERROR))
        .finally(() => {
          creatingPlanning.current = false;
          setPlanning(false);
        });
    },
    [planNextWeek, router, setViewedWeek],
  );

  const stepWeek = useCallback(
    (direction: -1 | 1) => {
      const result = stepNavigator(stops, index, direction);
      const canPlan =
        isAdmin(session?.role) && isHouseSetupComplete(snapshot?.household.setupStep ?? 0);
      if (
        futureSwipeCreatesPlanning({
          direction,
          moved: result.moved,
          kind: stops[index]?.kind,
          hasPlanning,
          canPlan,
        })
      ) {
        if (creatingPlanning.current) return true;
        startPlanning(true);
        return true;
      }
      if (!result.moved) return false;
      const selection = selectionFromStop(result.stop);
      setViewedWeek(selection);
      setSelectedNightId(null);
      router.replace(navigatorHref(selection), { scroll: false });
      return true;
    },
    [stops, index, setViewedWeek, router, hasPlanning, session?.role, snapshot?.household.setupStep, startPlanning],
  );

  if (!snapshot) return null;
  const viewingPast = Boolean(past);
  if (!viewingPast && !scope) return null;

  const locked = scope?.week.status === "locked";
  const todayIso = todayInTimeZone(new Date(), snapshot.household.timezone);
  const pendingFill =
    scope != null &&
    isPendingBotFill({
      weekStatus: scope.week.status,
      meals: scope.meals,
      votes: scope.votes,
      memberships: snapshot.memberships,
      recipes: scope.recipes,
      shoppingList: scope.shoppingList,
    });
  const botCheck = botCheckForHousehold(snapshot);
  const check = scope ? checkWeekLock(scope.meals, scope.votes, snapshot.memberships) : { ready: false };
  const nights = scope ? recipeNightsForWeek(scope.meals) : [];
  const dinner = scope ? upcomingDinner(scope.meals, scope.votes, todayIso) : undefined;
  const firstMeal =
    scope && showFirstMealRow({ weekStatus: scope.week.status, pendingFill, meal: dinner }) && dinner
      ? {
          id: dinner.id,
          title: dinner.title,
          weekday: weekdayLabelFromNight(dinner.nightDate),
        }
      : null;
  const stripNights = viewingPast
    ? (past?.nights ?? []).map((night) => ({
        id: night.nightDate,
        nightDate: night.nightDate,
        hasMeal: true,
      }))
    : nights.map((meal) => ({
        id: meal.id,
        nightDate: meal.nightDate,
        hasMeal: nightHasStripMeal(meal, scope?.votes ?? [], snapshot.memberships),
      }));
  const mutedDates =
    scope == null
      ? []
      : stripNights
          .filter(
            (night) =>
              night.hasMeal &&
              stripCellMuted({
                weekStatus: scope.week.status,
                nightDate: night.nightDate,
                editableFrom: scope.week.editableFrom,
              }),
          )
          .map((night) => night.nightDate);
  const todayMealId =
    stripNights.find((night) => night.hasMeal && night.nightDate === todayIso)?.id ?? null;
  const activeStop = stops[index];
  const title = activeStop ? navigatorTitle(activeStop) : "This week";
  const eyebrow = activeStop ? navigatorEyebrow(activeStop) : null;
  const showPlan =
    !viewingPast &&
    role === "cooking" &&
    !hasPlanning &&
    isAdmin(session?.role) &&
    isHouseSetupComplete(snapshot.household.setupStep);
  const showPeopleGate =
    scope != null &&
    planningPeopleGateOpen({
      role,
      peopleConfirmedAt: scope.week.peopleConfirmedAt,
      mealCount: scope.meals.length,
    });

  const act = async (mealId: string, choice: VoteChoice, note?: string) => {
    try {
      const message = await setVote(mealId, choice, note);
      if (message) setToast(message);
    } catch {
      // The provider rolls the night back and shows the error.
    }
  };

  return (
    <AppShell
      title={title}
      eyebrow={eyebrow?.text}
      eyebrowMuted={eyebrow?.muted}
      titleAside={locked ? <UnlockWeekControl variant="inline" /> : undefined}
      chrome={
        <WeekChrome
          startsOn={activeStop?.startsOn ?? snapshot.week.startsOn}
          nights={stripNights}
          selectedMealId={selectedNightId ?? (viewingPast ? null : todayMealId)}
          todayIso={todayIso}
          locked={Boolean(locked)}
          mutedDates={mutedDates}
          showShoppingList={
            scope != null &&
            showOpenShoppingList({
              weekStatus: scope.week.status,
              shoppingPrompt: scope.week.shoppingPrompt,
              pendingFill,
              items: scope.shoppingList?.items ?? null,
            })
          }
          firstMeal={firstMeal}
          onSelect={jumpToNight}
          onStep={stepWeek}
          planNext={
            showPlan
              ? {
                  busy: planning,
                  onPlan: () => startPlanning(false),
                }
              : null
          }
        />
      }
      status={undefined}
      footer={!viewingPast && !locked && check.ready && !showPeopleGate ? <LockBar /> : undefined}
    >
      <InstallPrompt />
      {viewingPast && past ? (
        <PastWeekDetail week={past} />
      ) : showPeopleGate && scope ? (
        <PlanningPeopleGate
          household={snapshot.household}
          canEdit={Boolean(session?.membershipId) && canActOnBallot(session?.role)}
          busy={planning}
          onSave={(counts, instructions) => savePlanningPeople(counts, instructions).then(() => undefined)}
          onBack={() => {
            setViewedWeek({ kind: "cooking" });
            router.replace(navigatorHref({ kind: "cooking" }), { scroll: false });
          }}
        />
      ) : nights.length === 0 ? (
        <EmptyWeek onCreateMeals={() => requestWeekBallot(scope?.week.startsOn)} />
      ) : (
        <div className="space-y-3">
          {pendingFill ? (
            <div data-slot="week-pending-fill" data-state="pending" className="mb-4">
              <PostLockWaitingCard
                mode={snapshot.household.botCheckMode}
                intervalHours={snapshot.household.botCheckIntervalHours}
                weekRole={role}
                startsOn={scope?.week.startsOn ?? snapshot.week.startsOn}
              />
            </div>
          ) : null}
          <WaitingBotCheck
            status={botCheck}
            pendingWorkOnly
            className="mb-1"
            checkNowHint={role === "planning" ? POST_LOCK_GET_RECIPES_NEXT_HINT : undefined}
            checkNowWakeHint={role === "planning" ? POST_LOCK_GET_RECIPES_NEXT_WAKE_HINT : undefined}
          />
          {nights.map((meal) => {
            const dayLabel = formatMealCardDayLabel(meal.nightDate);
            const dayName = weekdayLabelFromNight(meal.nightDate);
            const latest = latestVoteForMeal(scope?.votes ?? [], meal.id, snapshot.memberships);
            const lifecycle = nightLifecycle(meal, scope?.votes ?? [], snapshot.memberships);
            const nightLocked = nightStaysLocked({
              weekStatus: scope?.week.status ?? "voting",
              nightDate: meal.nightDate,
              editableFrom: scope?.week.editableFrom ?? null,
            });
            const canVote =
              Boolean(session?.membershipId) && canActOnBallot(session?.role) && !nightLocked;
            const presentation = weekNightPresentation(lifecycle, nightLocked);

            return (
              <div
                key={meal.id}
                id={nightCardAnchorId(meal.id)}
                tabIndex={-1}
                data-slot="night-card-anchor"
                className="scroll-mt-[calc(var(--shell-head-h)+0.25rem)] rounded-[14px] outline-none focus:ring-2 focus:ring-primary/40"
              >
                {renderNightCard({
                  presentation,
                  dayLabel,
                  dayName,
                  meal,
                  latestNote: latest?.note,
                  canVote,
                  locked: nightLocked,
                  pending: pendingFill,
                  lifecycle,
                  onAct: act,
                  onWaiting: () => setWaitingOpen(true),
                })}
              </div>
            );
          })}
        </div>
      )}
      {snapshot.mealHistory.length > 0 ? (
        <p className="mt-6 text-center">
          <Link
            href="/settings/history"
            data-slot="past-weeks-link"
            className="type-meta text-muted-foreground underline decoration-muted-foreground/40 underline-offset-4"
          >
            {PAST_WEEKS_LABEL}
          </Link>
        </p>
      ) : null}
      <BallotToast message={toast} onDismiss={dismissToast} />
      <PostLockWaitingSheet
        open={waitingOpen}
        onOpenChange={setWaitingOpen}
        mode={snapshot.household.botCheckMode}
        intervalHours={snapshot.household.botCheckIntervalHours}
        weekRole={role}
        startsOn={scope?.week.startsOn ?? past?.startsOn ?? snapshot.week.startsOn}
      />
    </AppShell>
  );
}

function renderNightCard({
  presentation,
  dayLabel,
  dayName,
  meal,
  latestNote,
  canVote,
  locked,
  pending,
  lifecycle,
  onAct,
  onWaiting,
}: {
  presentation: WeekNightPresentation;
  dayLabel: string;
  dayName: string;
  meal: Meal;
  latestNote?: string;
  canVote: boolean;
  locked: boolean;
  pending: boolean;
  lifecycle: NightLifecycle;
  onAct: (mealId: string, choice: VoteChoice, note?: string) => void;
  onWaiting: () => void;
}): ReactNode {
  switch (presentation) {
    case "empty":
      return (
        <EmptyDayCard
          dayLabel={dayLabel}
          dayName={dayName}
          state="empty"
          onAdd={canVote ? (note) => onAct(meal.id, "request_new_meal", note) : undefined}
        />
      );
    case "pending_add":
      return (
        <EmptyDayCard
          dayLabel={dayLabel}
          dayName={dayName}
          state="pending"
          note={latestNote}
          onCancel={canVote ? () => onAct(meal.id, "remove") : undefined}
        />
      );
    case "locked_empty":
      return <EmptyDayCard dayLabel={dayLabel} dayName={dayName} state="locked" />;
    case "ballot":
      return (
        <LockedNightFrame
          tap={lockedDinnerTap({ locked, pending, presentation })}
          href={`/week/${meal.id}`}
          title={meal.title}
          onWaiting={onWaiting}
        >
          <BallotCard
            dayLabel={dayLabel}
            confirmDayLabel={dayName}
            title={meal.title}
            pitch={meal.pitch}
            servings={meal.servings}
            swapped={lifecycle === "swapped"}
            swapNote={latestNote}
            muted={isMutedBallotNight({
              isLeftovers: meal.isLeftovers,
              isNightOff: false,
            })}
            locked={locked}
            onSwap={canVote ? (reason) => onAct(meal.id, "swap", reason) : undefined}
            onRemove={canVote ? () => onAct(meal.id, "remove") : undefined}
          />
        </LockedNightFrame>
      );
    default: {
      const _exhaustive: never = presentation;
      return _exhaustive;
    }
  }
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
          {creating ? <Loader2 className="size-5 animate-spin" aria-hidden /> : null}
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
  const { scope, role } = useViewedWeek();
  const [creating, setCreating] = useState(false);
  const setupIncomplete = !isHouseSetupComplete(snapshot?.household.setupStep ?? 8);
  const botCheck = snapshot ? botCheckForHousehold(snapshot) : null;
  const copy = emptyWeekPresentation({
    setupIncomplete,
    ballotStatus: scope?.ballotRequest?.status ?? null,
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
      {copy.action === "waiting" && botCheck ? (
        <WaitingBotCheck
          status={botCheck}
          checkNowWhenIdle
          className="mt-4"
          checkNowHint={role === "planning" ? POST_LOCK_GET_RECIPES_NEXT_HINT : undefined}
          checkNowWakeHint={role === "planning" ? POST_LOCK_GET_RECIPES_NEXT_WAKE_HINT : undefined}
        />
      ) : null}
    </div>
  );
}
