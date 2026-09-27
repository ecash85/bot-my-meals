"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Minus, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { HouseCard } from "@/components/house-card";
import { HouseStores } from "@/components/house-stores";
import { InviteShare } from "@/components/invite-share";
import { NightToggles } from "@/components/night-toggles";
import { PeoplePerNight } from "@/components/people-per-night";
import { useSupper } from "@/components/supper-provider";
import { WeeklyBudgetField } from "@/components/weekly-budget-field";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { MAX_HEADCOUNT, MIN_HEADCOUNT } from "@/lib/headcount";
import {
  ALL_NIGHTS_ON,
  CREATE_MEALS_CTA,
  DIY_GROK_PASTE_CTA,
  applyNightOnsToHeadcounts,
  clampHouseholdSize,
  formatWeeklyBudgetDollars,
  grokBotPastePrompt,
  headcountsFromNightOns,
  houseSetupProgressLabel,
  houseSetupStepMeta,
  nextHouseSetupStep,
  nightsOnFromHeadcounts,
  nightsPlannedFromOns,
  parseWeeklyBudgetDollars,
  previousHouseSetupStep,
} from "@/lib/house-setup";
import { SETUP_HELPER, SETUP_TITLE } from "@/lib/setup";
import { isAdmin } from "@/lib/users";

export function SetupWizard() {
  const {
    snapshot,
    session,
    updateHousehold,
    addStore,
    removeStore,
    createJoinToken,
    requestWeekBallot,
  } = useSupper();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [budgetDraft, setBudgetDraft] = useState<string | null>(null);
  const [sizeDraft, setSizeDraft] = useState<number | null>(null);
  const [nightsOnDraft, setNightsOnDraft] = useState<boolean[] | null>(null);
  const [askCopied, setAskCopied] = useState(false);
  const triedJoinToken = useRef(false);

  const household = snapshot?.household;
  const step = household?.setupStep ?? 1;
  const meta = houseSetupStepMeta(step);
  const budget = budgetDraft ?? formatWeeklyBudgetDollars(household?.weeklyBudgetCents);
  const householdSize = sizeDraft ?? household?.householdSize ?? 2;
  const nightsOn =
    nightsOnDraft ??
    (household ? nightsOnFromHeadcounts(household.nightHeadcounts) : [...ALL_NIGHTS_ON]);

  useEffect(() => {
    if (triedJoinToken.current || !snapshot || snapshot.joinToken || !isAdmin(session?.role)) return;
    triedJoinToken.current = true;
    void createJoinToken(false);
  }, [createJoinToken, session?.role, snapshot]);

  if (!snapshot || !household) return null;

  const owner = isAdmin(session?.role);

  const advance = async (patch: Parameters<typeof updateHousehold>[0] = {}) => {
    setBusy(true);
    setError(null);
    try {
      const setupStep = nextHouseSetupStep(step);
      await updateHousehold({
        ...patch,
        setupStep,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save this step.");
    } finally {
      setBusy(false);
    }
  };

  const goBack = async () => {
    setBusy(true);
    setError(null);
    try {
      await updateHousehold({ setupStep: previousHouseSetupStep(step) });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not go back.");
    } finally {
      setBusy(false);
    }
  };

  const saveBudgetAndContinue = async () => {
    try {
      const weeklyBudgetCents = parseWeeklyBudgetDollars(budget);
      await advance({ weeklyBudgetCents });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save this step.");
    }
  };

  const saveSizeAndContinue = async () => {
    const size = clampHouseholdSize(householdSize);
    const ons = nightsOnDraft ?? [...ALL_NIGHTS_ON];
    await advance({
      householdSize: size,
      familySize: size,
      nightsPlanned: nightsPlannedFromOns(ons),
      nightHeadcounts: headcountsFromNightOns(size, ons),
    });
  };

  const saveNightsAndContinue = async () => {
    const size = clampHouseholdSize(householdSize);
    const ons = nightsOn;
    await advance({
      householdSize: size,
      nightsPlanned: nightsPlannedFromOns(ons),
      nightHeadcounts: applyNightOnsToHeadcounts(household.nightHeadcounts, size, ons),
    });
  };

  const createMeals = async () => {
    setBusy(true);
    setError(null);
    try {
      await requestWeekBallot();
      router.replace("/week");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create this week's meals.");
    } finally {
      setBusy(false);
    }
  };

  const stepId = meta.id;
  const askPrompt = grokBotPastePrompt({
    householdName: household.name,
    nightHeadcounts: household.nightHeadcounts,
    storeNames: snapshot.stores.map((store) => store.name),
    weeklyBudgetCents: household.weeklyBudgetCents,
  });

  const copyAskPrompt = async () => {
    try {
      await navigator.clipboard.writeText(askPrompt);
      setAskCopied(true);
    } catch {
      setAskCopied(true);
    }
  };

  let footer: ReactNode;
  switch (stepId) {
    case "create-meals":
      footer = (
        <>
          <Button
            type="button"
            size="fat"
            variant="primary"
            className="w-full"
            disabled={busy}
            aria-label={busy ? "Saving" : CREATE_MEALS_CTA}
            aria-busy={busy}
            onClick={() => void createMeals()}
          >
            {busy ? "Saving…" : CREATE_MEALS_CTA}
          </Button>
          <Button
            type="button"
            size="fat"
            variant="outline"
            className="w-full"
            disabled={busy}
            onClick={() => void goBack()}
          >
            Back
          </Button>
        </>
      );
      break;
    case "budget":
      footer = (
        <>
          <Button
            type="button"
            size="fat"
            variant="primary"
            className="w-full"
            disabled={busy}
            aria-label={busy ? "Saving" : budget.trim() ? "Continue" : "Skip"}
            aria-busy={busy}
            onClick={() => void saveBudgetAndContinue()}
          >
            {busy ? "Saving…" : budget.trim() ? "Continue" : "Skip"}
          </Button>
          <Button
            type="button"
            size="fat"
            variant="outline"
            className="w-full"
            disabled={busy}
            onClick={() => void goBack()}
          >
            Back
          </Button>
        </>
      );
      break;
    case "plates":
      footer = (
        <>
          <Button
            type="button"
            size="fat"
            variant="primary"
            className="w-full"
            disabled={busy}
            aria-label={busy ? "Saving" : "Continue"}
            aria-busy={busy}
            onClick={() => void advance()}
          >
            {busy ? "Saving…" : "Continue"}
          </Button>
          <Button
            type="button"
            size="fat"
            variant="outline"
            className="w-full"
            disabled={busy}
            onClick={() => void goBack()}
          >
            Back
          </Button>
        </>
      );
      break;
    case "size":
      footer = (
        <>
          <Button
            type="button"
            size="fat"
            variant="primary"
            className="w-full"
            disabled={busy}
            aria-label={busy ? "Saving" : meta.cta}
            aria-busy={busy}
            onClick={() => void saveSizeAndContinue()}
          >
            {busy ? "Saving…" : meta.cta}
          </Button>
          <Button
            type="button"
            size="fat"
            variant="outline"
            className="w-full"
            disabled={busy}
            onClick={() => void goBack()}
          >
            Back
          </Button>
        </>
      );
      break;
    case "nights":
      footer = (
        <>
          <Button
            type="button"
            size="fat"
            variant="primary"
            className="w-full"
            disabled={busy}
            aria-label={busy ? "Saving" : "Continue"}
            aria-busy={busy}
            onClick={() => void saveNightsAndContinue()}
          >
            {busy ? "Saving…" : "Continue"}
          </Button>
          <Button
            type="button"
            size="fat"
            variant="outline"
            className="w-full"
            disabled={busy}
            onClick={() => void goBack()}
          >
            Back
          </Button>
        </>
      );
      break;
    case "invite":
    case "stores":
      footer = (
        <>
          <Button
            type="button"
            size="fat"
            variant="primary"
            className="w-full"
            disabled={busy}
            aria-label={busy ? "Saving" : "Continue"}
            aria-busy={busy}
            onClick={() =>
              void advance(
                stepId === "stores" ? { postalCode: household.postalCode } : {},
              )
            }
          >
            {busy ? "Saving…" : "Continue"}
          </Button>
          {step > 1 ? (
            <Button
              type="button"
              size="fat"
              variant="outline"
              className="w-full"
              disabled={busy}
              onClick={() => void goBack()}
            >
              Back
            </Button>
          ) : null}
        </>
      );
      break;
    default: {
      const _exhaustive: never = stepId;
      footer = _exhaustive;
    }
  }

  let body: ReactNode;
  switch (stepId) {
    case "invite":
      body = (
        <HouseCard data-slot="setup-card">
          <p className="type-body text-muted-foreground">{meta.helper}</p>
          <InviteShare token={snapshot.joinToken ?? null} />
        </HouseCard>
      );
      break;
    case "size":
      body = (
        <HouseCard data-slot="setup-card">
          <p className="type-body text-muted-foreground">{meta.helper}</p>
          <div data-slot="household-size" className="mt-6 flex flex-col items-center">
            <CountStepper
              label="people"
              value={householdSize}
              min={MIN_HEADCOUNT}
              max={MAX_HEADCOUNT}
              canEdit={owner}
              onChange={setSizeDraft}
            />
          </div>
        </HouseCard>
      );
      break;
    case "nights":
      body = (
        <HouseCard data-slot="setup-card">
          <p className="type-body text-muted-foreground">{meta.helper}</p>
          <NightToggles nightsOn={nightsOn} canEdit={owner} onChange={setNightsOnDraft} />
        </HouseCard>
      );
      break;
    case "plates":
      body = (
        <PeoplePerNight
          household={household}
          canEdit={owner}
          title="Plates per night"
          helper={meta.helper}
          compactOffNights
          onChange={(patch) => void updateHousehold(patch)}
        />
      );
      break;
    case "stores":
      body = (
        <HouseStores
          stores={snapshot.stores}
          canEdit={owner}
          helper={meta.helper}
          postalCode={household.postalCode}
          onPostalCode={(code) => void updateHousehold({ postalCode: code || null })}
          onAdd={(slug, name) => void addStore(slug, name)}
          onRemove={(id) => void removeStore(id)}
        />
      );
      break;
    case "budget":
      body = (
        <HouseCard data-slot="setup-card">
          <div className="space-y-1.5">
            <Label htmlFor="weekly-budget">Weekly meal budget</Label>
            <p id="weekly-budget-hint" className="type-meta text-muted-foreground">
              {meta.helper}
            </p>
            <WeeklyBudgetField
              id="weekly-budget"
              value={budget}
              postalCode={household.postalCode}
              describedBy="weekly-budget-hint"
              onChange={setBudgetDraft}
            />
          </div>
        </HouseCard>
      );
      break;
    case "create-meals":
      body = (
        <HouseCard data-slot="setup-card">
          <p className="type-body text-muted-foreground">{meta.helper}</p>
          <details className="mt-4" data-slot="diy-grok-paste">
            <summary className="type-body min-h-12 cursor-pointer list-inside font-medium text-primary">
              {DIY_GROK_PASTE_CTA}
            </summary>
            <pre
              data-slot="ask-bot-paste"
              className="type-meta mt-3 whitespace-pre-wrap rounded-[14px] bg-secondary px-4 py-3 text-left text-foreground"
            >
              {askPrompt}
            </pre>
            <Button
              type="button"
              size="fat"
              variant="outline"
              className="mt-3 w-full"
              onClick={() => void copyAskPrompt()}
            >
              {askCopied ? "Copied" : "Copy"}
            </Button>
          </details>
        </HouseCard>
      );
      break;
    default: {
      const _exhaustive: never = stepId;
      body = _exhaustive;
    }
  }

  return (
    <AppShell
      title={meta.title}
      eyebrow={houseSetupProgressLabel(step)}
      hideNav
      footer={<div data-slot="setup-cta" className="space-y-2">{footer}</div>}
    >
      <div data-slot="setup-wizard" className="flex min-h-0 flex-1 flex-col">
        <p className="type-eyebrow text-primary">{SETUP_TITLE}</p>
        <p className="type-meta mt-1 text-muted-foreground">{SETUP_HELPER}</p>
        <div className="mt-4">{body}</div>
        {error ? <p className="type-meta mt-3 text-destructive">{error}</p> : null}
      </div>
    </AppShell>
  );
}

function CountStepper({
  label,
  value,
  min,
  max,
  canEdit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  canEdit: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center gap-4">
        <button
          type="button"
          aria-label={`Fewer ${label.toLowerCase()}`}
          disabled={!canEdit || value <= min}
          onClick={() => onChange(value - 1)}
          className="tap-target flex size-12 items-center justify-center rounded-[var(--radius-button)] bg-card text-foreground shadow-card disabled:opacity-40"
        >
          <Minus className="size-5" />
        </button>
        <p className="min-w-12 text-center font-heading text-4xl font-semibold tabular-nums">{value}</p>
        <button
          type="button"
          aria-label={`More ${label.toLowerCase()}`}
          disabled={!canEdit || value >= max}
          onClick={() => onChange(value + 1)}
          className="tap-target flex size-12 items-center justify-center rounded-[var(--radius-button)] bg-card text-foreground shadow-card disabled:opacity-40"
        >
          <Plus className="size-5" />
        </button>
      </div>
      <p className="type-meta mt-1 text-muted-foreground">{label}</p>
      <input
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        disabled={!canEdit}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-label={label}
        className="sr-only"
      />
    </div>
  );
}
