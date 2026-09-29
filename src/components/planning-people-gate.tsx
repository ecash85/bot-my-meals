"use client";

import { useState } from "react";
import { PeoplePerNight } from "@/components/people-per-night";
import { Button } from "@/components/ui/button";
import { withDerivedNightSettings } from "@/lib/headcount";
import {
  PLANNING_PEOPLE_BACK_LABEL,
  PLANNING_PEOPLE_HELPER,
  PLANNING_PEOPLE_NEED_NIGHT,
  PLANNING_PEOPLE_SAVE_LABEL,
  PLANNING_PEOPLE_TITLE,
  SPECIAL_INSTRUCTIONS_HELPER,
  SPECIAL_INSTRUCTIONS_LABEL,
  SPECIAL_INSTRUCTIONS_MAX,
  SPECIAL_INSTRUCTIONS_PLACEHOLDER,
  hasDinnerNight,
} from "@/lib/planning-people";
import type { Household } from "@/lib/types";

export function PlanningPeopleGate({
  household,
  canEdit,
  busy = false,
  initialCounts,
  initialInstructions = "",
  showInstructions = true,
  lockedWeekdays = [],
  cancelLabel = PLANNING_PEOPLE_BACK_LABEL,
  onSave,
  onBack,
}: {
  household: Household;
  canEdit: boolean;
  busy?: boolean;
  /** Week plates when reopening Edit nights. The empty gate uses House defaults. */
  initialCounts?: number[];
  initialInstructions?: string;
  showInstructions?: boolean;
  lockedWeekdays?: readonly number[];
  cancelLabel?: string;
  onSave: (counts: number[], instructions: string) => Promise<void>;
  onBack: () => void;
}) {
  const [counts, setCounts] = useState(() => [...(initialCounts ?? household.nightHeadcounts)]);
  const [instructions, setInstructions] = useState(initialInstructions);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const draft = withDerivedNightSettings(household, counts);
  const locked = busy || saving || !canEdit;

  const save = () => {
    if (!hasDinnerNight(counts)) {
      setError(PLANNING_PEOPLE_NEED_NIGHT);
      return;
    }
    setError(null);
    setSaving(true);
    void onSave(counts, instructions)
      .catch((err: unknown) => {
        setError(err instanceof Error && err.message ? err.message : PLANNING_PEOPLE_NEED_NIGHT);
      })
      .finally(() => setSaving(false));
  };

  return (
    <div data-slot="planning-people-gate">
      <PeoplePerNight
        household={draft}
        canEdit={!locked}
        title={PLANNING_PEOPLE_TITLE}
        helper={PLANNING_PEOPLE_HELPER}
        compactOffNights={false}
        className="mt-0"
        lockedWeekdays={lockedWeekdays}
        onChange={(patch) => {
          if (patch.nightHeadcounts) setCounts(patch.nightHeadcounts);
        }}
      >
        {showInstructions ? (
          <label className="mt-5 block" htmlFor="planning-special-instructions">
            <span className="type-body font-semibold">{SPECIAL_INSTRUCTIONS_LABEL}</span>
            <span className="type-meta mt-1 block text-muted-foreground">{SPECIAL_INSTRUCTIONS_HELPER}</span>
            <textarea
              id="planning-special-instructions"
              data-slot="special-instructions"
              rows={3}
              maxLength={SPECIAL_INSTRUCTIONS_MAX}
              placeholder={SPECIAL_INSTRUCTIONS_PLACEHOLDER}
              value={instructions}
              disabled={locked}
              onChange={(event) => setInstructions(event.target.value)}
              className="type-body mt-2 w-full resize-y rounded-[var(--radius-button)] border border-border bg-card px-3 py-2 text-foreground"
            />
          </label>
        ) : null}
      </PeoplePerNight>
      {error ? (
        <p data-slot="planning-people-error" className="type-meta mt-3 text-destructive">
          {error}
        </p>
      ) : null}
      <Button
        type="button"
        variant="primary"
        size="fat"
        data-slot="planning-people-save"
        className="mt-4 w-full"
        disabled={locked}
        aria-busy={saving || busy}
        onClick={save}
      >
        {saving || busy ? "Saving…" : PLANNING_PEOPLE_SAVE_LABEL}
      </Button>
      <button
        type="button"
        data-slot="planning-people-back"
        className="type-meta mt-2 inline-flex min-h-12 w-full items-center justify-center font-semibold text-primary"
        onClick={onBack}
      >
        {cancelLabel}
      </button>
    </div>
  );
}
