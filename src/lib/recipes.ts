import { isNightOff } from "./lock";
import type { Meal, Vote } from "./types";

/** Ballot week order — every night, including leftovers and Thursday. Never drop a day. */
export function recipeNightsForWeek(meals: Meal[]): Meal[] {
  return [...meals].sort((a, b) => a.dayIndex - b.dayIndex || a.nightDate.localeCompare(b.nightDate));
}

export function firstCookableMeal(
  meals: Meal[],
  votes: Vote[],
  todayIso?: string,
): Meal | undefined {
  return recipeNightsForWeek(meals).find((meal) => {
    if (isNightOff(meal.id, votes)) return false;
    if (todayIso && meal.nightDate < todayIso) return false;
    return true;
  });
}
