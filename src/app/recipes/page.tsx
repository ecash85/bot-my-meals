"use client";

import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { AuthGate } from "@/components/auth-gate";
import { LockFirstEmpty } from "@/components/lock-first-empty";
import { PostLockWaitingCard } from "@/components/post-lock-waiting";
import { StatusStrip } from "@/components/status-strip";
import { useSupper } from "@/components/supper-provider";
import { EMPTY_DAY_TITLE } from "@/lib/ballot";
import { formatWeekEyebrow, weekdayShortFromNight } from "@/lib/dates";
import { isNightOff } from "@/lib/lock";
import {
  LOCK_FIRST_TITLE,
  RECIPES_EMPTY_WEEK,
  RECIPES_NO_HOUSEHOLD,
  RECIPES_PRE_LOCK_DESCRIPTION,
} from "@/lib/lock-success";
import { RECIPE_PENDING_BACK, isPendingBotFill } from "@/lib/post-lock-waiting";
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
  if (!snapshot) {
    return (
      <AppShell title="Recipes">
        <p className="type-body text-muted-foreground">{RECIPES_NO_HOUSEHOLD}</p>
      </AppShell>
    );
  }

  const locked = snapshot.week.status === "locked";
  const pendingFill = isPendingBotFill({
    weekStatus: snapshot.week.status,
    meals: snapshot.meals,
    votes: snapshot.votes,
    memberships: snapshot.memberships,
    recipes: snapshot.recipes,
    shoppingList: snapshot.shoppingList,
  });
  const nights = recipeNightsForWeek(snapshot.meals);
  const removedMealIds = new Set(
    nights.filter((meal) => isNightOff(meal.id, snapshot.votes)).map((meal) => meal.id),
  );
  const firstMeal = firstCookableMeal(nights, snapshot.votes);

  if (!locked) {
    return (
      <AppShell
        title="Recipes"
        eyebrow={formatWeekEyebrow(snapshot.week.startsOn)}
        backHref="/week"
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
        eyebrow={formatWeekEyebrow(snapshot.week.startsOn, true)}
        backHref="/week"
        backLabel={RECIPE_PENDING_BACK}
      >
        <PostLockWaitingCard
          mode={snapshot.household.botCheckMode}
          intervalHours={snapshot.household.botCheckIntervalHours}
        />
      </AppShell>
    );
  }

  if (nights.length === 0) {
    return (
      <AppShell
        title="Recipes"
        eyebrow={formatWeekEyebrow(snapshot.week.startsOn, true)}
        backHref="/week"
      >
        <div className="rounded-[14px] border border-dashed border-border bg-card p-5 shadow-card">
          <h2 className="type-section">No dinners yet</h2>
          <p className="type-body mt-2 text-muted-foreground">{RECIPES_EMPTY_WEEK}</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Recipes"
      eyebrow={formatWeekEyebrow(snapshot.week.startsOn, true)}
      backHref="/week"
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
