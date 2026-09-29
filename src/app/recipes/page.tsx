"use client";

import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { AuthGate } from "@/components/auth-gate";
import { LockFirstEmpty } from "@/components/lock-first-empty";
import { PostLockWaitingCard } from "@/components/post-lock-waiting";
import { PastWeekDetail } from "@/components/past-weeks";
import { StatusStrip } from "@/components/status-strip";
import { useSupper } from "@/components/supper-provider";
import { useViewedWeek } from "@/components/use-viewed-week";
import { EMPTY_DAY_TITLE } from "@/lib/ballot";
import { formatWeekEyebrow, formatWeekRange, weekdayShortFromNight } from "@/lib/dates";
import { todayInTimeZone } from "@/lib/meal-history";
import { isNightOff } from "@/lib/lock";
import {
  LOCK_FIRST_TITLE,
  RECIPES_EMPTY_NEXT_WEEK,
  RECIPES_EMPTY_WEEK,
  RECIPES_NO_HOUSEHOLD,
  RECIPES_PRE_LOCK_DESCRIPTION,
} from "@/lib/lock-success";
import { weekHomeTitle } from "@/lib/open-weeks";
import { isPendingBotFill } from "@/lib/post-lock-waiting";
import { firstCookableMeal, recipeNightsForWeek } from "@/lib/recipes";
import { cn } from "@/lib/utils";

export default function RecipesPage() {
  return (
    <AuthGate>
      <RecipesBody />
    </AuthGate>
  );
}

function RecipesBody() {
  const { snapshot } = useSupper();
  const { role, scope, past } = useViewedWeek();
  if (!snapshot) {
    return (
      <AppShell title="Recipes">
        <p className="type-body text-muted-foreground">{RECIPES_NO_HOUSEHOLD}</p>
      </AppShell>
    );
  }

  if (past) {
    return (
      <AppShell
        title="Recipes"
        eyebrow={formatWeekRange(past.startsOn)}
        backHref="/week"
        backLabel={formatWeekRange(past.startsOn)}
      >
        <PastWeekDetail week={past} />
      </AppShell>
    );
  }

  if (!scope) {
    return (
      <AppShell title="Recipes">
        <p className="type-body text-muted-foreground">{RECIPES_NO_HOUSEHOLD}</p>
      </AppShell>
    );
  }

  const locked = scope.week.status === "locked";
  const backLabel = weekHomeTitle(role);
  const pendingFill = isPendingBotFill({
    weekStatus: scope.week.status,
    meals: scope.meals,
    votes: scope.votes,
    memberships: snapshot.memberships,
    recipes: scope.recipes,
    shoppingList: scope.shoppingList,
  });
  const nights = recipeNightsForWeek(scope.meals);
  const removedMealIds = new Set(
    nights.filter((meal) => isNightOff(meal.id, scope.votes)).map((meal) => meal.id),
  );
  const todayIso = todayInTimeZone(new Date(), snapshot.household.timezone);
  const firstMeal = firstCookableMeal(nights, scope.votes, todayIso);

  if (!locked) {
    return (
      <AppShell
        title="Recipes"
        eyebrow={formatWeekEyebrow(scope.week.startsOn)}
        backHref="/week"
        backLabel={backLabel}
      >
        <LockFirstEmpty
          title={LOCK_FIRST_TITLE}
          description={RECIPES_PRE_LOCK_DESCRIPTION}
          meals={nights}
          removedMealIds={removedMealIds}
        />
      </AppShell>
    );
  }

  if (pendingFill) {
    return (
      <AppShell
        title="Recipes"
        eyebrow={formatWeekEyebrow(scope.week.startsOn, true)}
        backHref="/week"
        backLabel={backLabel}
      >
        <PostLockWaitingCard weekRole={role} startsOn={scope.week.startsOn} />
      </AppShell>
    );
  }

  if (nights.length === 0) {
    return (
      <AppShell
        title="Recipes"
        eyebrow={formatWeekEyebrow(scope.week.startsOn, true)}
        backHref="/week"
        backLabel={backLabel}
      >
        <div className="rounded-[14px] border border-dashed border-border bg-card p-5 shadow-card">
          <h2 className="type-section">No dinners yet</h2>
          <p className="type-body mt-2 text-muted-foreground">
            {role === "planning" ? RECIPES_EMPTY_NEXT_WEEK : RECIPES_EMPTY_WEEK}
          </p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Recipes"
      eyebrow={formatWeekEyebrow(scope.week.startsOn, true)}
      backHref="/week"
      backLabel={backLabel}
      status={<StatusStrip state="locked" people={[]} />}
    >
      <div className="space-y-3">
        {nights.map((meal) => {
          const removed = removedMealIds.has(meal.id);
          const selected = firstMeal?.id === meal.id;
          return (
            <Link
              key={meal.id}
              href={`/week/${meal.id}`}
              data-slot="recipe-night"
              data-day={meal.dayIndex}
              aria-label={`${weekdayShortFromNight(meal.nightDate)} ${removed ? EMPTY_DAY_TITLE : meal.title}`}
              className={cn(
                "tap-target block rounded-[14px] p-4 shadow-card",
                removed ? "bg-card-tint" : "bg-card",
                selected && "ring-2 ring-primary",
              )}
            >
              <p className="type-eyebrow text-muted-foreground">
                {weekdayShortFromNight(meal.nightDate)}
              </p>
              <h2 className="type-section mt-1">{removed ? EMPTY_DAY_TITLE : meal.title}</h2>
            </Link>
          );
        })}
      </div>
    </AppShell>
  );
}
