"use client";

import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { AuthGate } from "@/components/auth-gate";
import { BallotToast } from "@/components/ballot-toast";
import { SavedMealsList, savedMealRemoveToast, savedMealRequestToast } from "@/components/saved-meals";
import { useSupper } from "@/components/supper-provider";
import { canActOnBallot } from "@/lib/lock";
import { dinnerRecipeReady } from "@/lib/post-lock-waiting";
import { planningTargetStarts } from "@/lib/open-weeks";
import { SAVED_MEALS_LABEL, mealRecipeKey } from "@/lib/saved-meals";

export default function SavedMealsPage() {
  return (
    <AuthGate>
      <SavedMealsBody />
    </AuthGate>
  );
}

function SavedMealsBody() {
  const { snapshot, session, removeSavedMeal, requestSavedMeal } = useSupper();
  const [toast, setToast] = useState<string | undefined>();
  const now = useMemo(() => new Date(), []);

  if (!snapshot) {
    return (
      <AppShell title={SAVED_MEALS_LABEL} backHref="/settings" backLabel="House">
        <p className="type-body text-muted-foreground">Create or join a household first.</p>
      </AppShell>
    );
  }

  const detailHrefByKey = new Map<string, string>();
  const weeks = [snapshot.meals, snapshot.planning?.meals ?? []];
  const recipePools = [snapshot.recipes, snapshot.planning?.recipes ?? []];
  weeks.forEach((meals, index) => {
    const recipes = recipePools[index] ?? [];
    for (const meal of meals) {
      const recipe = recipes.find((item) => item.mealId === meal.id);
      if (!dinnerRecipeReady(meal, recipes)) continue;
      const key = mealRecipeKey({ title: meal.title, recipeKey: recipe?.recipeKey });
      if (key && !detailHrefByKey.has(key)) detailHrefByKey.set(key, `/week/${meal.id}`);
    }
  });

  return (
    <AppShell title={SAVED_MEALS_LABEL} backHref="/settings" backLabel="House">
      <SavedMealsList
        meals={snapshot.savedMeals}
        timeZone={snapshot.household.timezone}
        currentWeekStartsOn={planningTargetStarts(snapshot)}
        canAct={canActOnBallot(session?.role)}
        detailHrefByKey={detailHrefByKey}
        now={now}
        onRemove={async (recipeKey) => {
          await removeSavedMeal(recipeKey);
          setToast(savedMealRemoveToast());
        }}
        onRequest={async (recipeKey) => {
          const result = await requestSavedMeal(recipeKey);
          setToast(savedMealRequestToast(result));
          return result;
        }}
      />
      <BallotToast message={toast} onDismiss={() => setToast(undefined)} />
    </AppShell>
  );
}
