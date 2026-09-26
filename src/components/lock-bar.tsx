"use client";

import { Lock } from "lucide-react";
import Link from "next/link";
import { useSupper } from "@/components/supper-provider";
import { Button } from "@/components/ui/button";
import { weekdayLabelFromNight } from "@/lib/dates";
import { checkWeekLock } from "@/lib/lock";
import {
  LOCK_SUCCESS_LIST_CTA,
  LOCK_SUCCESS_LIST_KICKER,
  lockSuccessRecipesCta,
  lockSuccessRecipesKicker,
} from "@/lib/lock-success";
import { firstCookableMeal } from "@/lib/recipes";

export function LockBar() {
  const { snapshot, lockWeek, error } = useSupper();
  if (!snapshot) return null;

  const locked = snapshot.week.status === "locked";
  const check = checkWeekLock(snapshot.meals, snapshot.votes, snapshot.memberships);

  if (locked) {
    const firstMeal = firstCookableMeal(snapshot.meals, snapshot.votes);
    const weekday = firstMeal ? weekdayLabelFromNight(firstMeal.nightDate) : undefined;
    const recipesCta = lockSuccessRecipesCta(firstMeal?.title);
    return (
      <div data-slot="lock-bar" data-state="locked" className="space-y-3">
        <Link
          href="/list"
          data-slot="lock-success-list"
          aria-label={LOCK_SUCCESS_LIST_CTA}
          className="tap-target block rounded-[14px] bg-card p-4 shadow-card ring-1 ring-primary/20"
        >
          <p className="type-meta text-muted-foreground">{LOCK_SUCCESS_LIST_KICKER}</p>
          <p className="type-section mt-1 text-primary">{LOCK_SUCCESS_LIST_CTA}</p>
        </Link>
        <Link
          href="/recipes"
          data-slot="lock-success-recipes"
          aria-label={recipesCta}
          className="tap-target block rounded-[14px] bg-card p-4 shadow-card ring-1 ring-primary/20"
        >
          <p className="type-meta text-muted-foreground">{lockSuccessRecipesKicker(weekday)}</p>
          <p className="type-section mt-1 text-primary">{recipesCta}</p>
        </Link>
        {error ? <p className="type-meta text-destructive">{error}</p> : null}
      </div>
    );
  }

  if (!check.ready) return null;

  return (
    <div data-slot="lock-bar" data-state="ready" className="rounded-[14px] bg-card p-3 shadow-card">
      <Button
        size="fat"
        variant="primary"
        className="w-full gap-2 shadow-float"
        onClick={() => void lockWeek()}
      >
        <Lock className="size-5" />
        Lock this week
      </Button>
      {error ? <p className="type-meta mt-2 text-destructive">{error}</p> : null}
    </div>
  );
}
