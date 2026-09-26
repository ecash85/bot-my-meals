import type { HouseholdSnapshot, Recipe, ShoppingList } from "./types";

export function redactUntilLocked(snapshot: HouseholdSnapshot): HouseholdSnapshot {
  if (snapshot.week.status === "locked") return snapshot;
  return {
    ...snapshot,
    recipes: [] as Recipe[],
    shoppingList: null as ShoppingList | null,
  };
}
