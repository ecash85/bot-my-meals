"use client";

import { useSupper } from "@/components/supper-provider";
import { scopeForRole } from "@/lib/open-weeks";
import type { WeekRole, WeekScope } from "@/lib/types";

export function useViewedWeek(): {
  role: WeekRole;
  scope: WeekScope | null;
  hasPlanning: boolean;
  setViewedRole: (role: WeekRole) => void;
} {
  const { snapshot, viewedRole, setViewedRole } = useSupper();
  if (!snapshot) {
    return { role: "cooking", scope: null, hasPlanning: false, setViewedRole };
  }
  const hasPlanning = Boolean(snapshot.planning);
  const role: WeekRole = hasPlanning && viewedRole === "planning" ? "planning" : "cooking";
  return {
    role,
    scope: scopeForRole(snapshot, role),
    hasPlanning,
    setViewedRole,
  };
}
