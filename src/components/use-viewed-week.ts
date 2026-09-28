"use client";

import { useSupper } from "@/components/supper-provider";
import { scopeForRole } from "@/lib/open-weeks";
import type { WeekRole, WeekScope } from "@/lib/types";
import type { MealHistoryWeek } from "@/lib/types";
import {
  navigatorStops,
  resolveNavigatorIndex,
  type NavigatorStop,
  type ViewedWeekSelection,
} from "@/lib/week-navigator";

export function useViewedWeek(): {
  selection: ViewedWeekSelection;
  role: WeekRole;
  scope: WeekScope | null;
  past: MealHistoryWeek | null;
  hasPlanning: boolean;
  stops: NavigatorStop[];
  index: number;
  setViewedWeek: (selection: ViewedWeekSelection) => void;
  setViewedRole: (role: WeekRole) => void;
} {
  const { snapshot, viewedWeek, setViewedWeek, setViewedRole } = useSupper();
  if (!snapshot) {
    return {
      selection: { kind: "cooking" },
      role: "cooking",
      scope: null,
      past: null,
      hasPlanning: false,
      stops: [],
      index: 0,
      setViewedWeek,
      setViewedRole,
    };
  }

  const hasPlanning = Boolean(snapshot.planning);
  const stops = navigatorStops({
    historyStartsOn: snapshot.mealHistory.map((week) => week.startsOn),
    cookingStartsOn: snapshot.week.startsOn,
    planningStartsOn: snapshot.planning?.week.startsOn ?? null,
  });
  const index = resolveNavigatorIndex(stops, viewedWeek);
  const stop = stops[index];
  const selection: ViewedWeekSelection =
    stop?.kind === "past"
      ? { kind: "past", startsOn: stop.startsOn }
      : stop?.kind === "planning"
        ? { kind: "planning" }
        : { kind: "cooking" };
  const past =
    selection.kind === "past"
      ? (snapshot.mealHistory.find((week) => week.startsOn === selection.startsOn) ?? null)
      : null;
  const role: WeekRole = selection.kind === "planning" ? "planning" : "cooking";
  const scope = past ? null : scopeForRole(snapshot, role);

  return {
    selection,
    role,
    scope,
    past,
    hasPlanning,
    stops,
    index,
    setViewedWeek,
    setViewedRole,
  };
}
