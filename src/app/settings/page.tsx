"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AppearancePicker } from "@/components/appearance-picker";
import { BotCheckFrequency } from "@/components/bot-check-frequency";
import { AppShell } from "@/components/app-shell";
import { AuthGate } from "@/components/auth-gate";
import { HouseCard } from "@/components/house-card";
import { HouseStores } from "@/components/house-stores";
import { InstallPrompt } from "@/components/install-prompt";
import { InviteShare } from "@/components/invite-share";
import { ManagePeople } from "@/components/manage-people";
import { PeoplePerNight } from "@/components/people-per-night";
import { useSupper } from "@/components/supper-provider";
import { WeeklyBudgetField } from "@/components/weekly-budget-field";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  formatWeeklyBudgetDollars,
  parseWeeklyBudgetDollars,
  shouldShowHouseSetup,
  weeklyBudgetCurrencyPrefix,
} from "@/lib/house-setup";
import { isAdmin, roleLabel } from "@/lib/users";

export default function SettingsPage() {
  return (
    <AuthGate>
      <SettingsBody />
    </AuthGate>
  );
}

function SettingsBody() {
  const {
    snapshot,
    session,
    signOut,
    updateHousehold,
    addStore,
    removeStore,
    unlockWeek,
    createJoinToken,
  } = useSupper();
  const router = useRouter();
  const owner = isAdmin(session?.role);
  const [budgetDraft, setBudgetDraft] = useState<string | null>(null);
  const [budgetError, setBudgetError] = useState<string | null>(null);
  const triedJoinToken = useRef(false);
  const budget =
    budgetDraft ?? formatWeeklyBudgetDollars(snapshot?.household.weeklyBudgetCents);

  useEffect(() => {
    if (triedJoinToken.current || !owner || !snapshot || snapshot.joinToken) return;
    triedJoinToken.current = true;
    void createJoinToken(false);
  }, [createJoinToken, owner, snapshot]);

  if (!snapshot) {
    return (
      <AppShell title="House">
        <p className="type-body text-muted-foreground">Create or join a household first.</p>
        <AppearancePicker />
      </AppShell>
    );
  }

  return (
    <AppShell title={snapshot.household.name} eyebrow="Household">
      <InstallPrompt />

      <HouseCard>
        <p className="type-eyebrow text-primary">Signed in as</p>
        <p className="type-title mt-1">{session?.displayName}</p>
        <p className="type-meta text-muted-foreground">
          {session?.email}
          {session?.role ? ` · ${roleLabel(session.role)}` : null}
        </p>
        <Button
          variant="outline"
          size="fat"
          className="mt-3 w-full"
          onClick={async () => {
            await signOut();
            router.push("/login");
          }}
        >
          Sign out
        </Button>
      </HouseCard>

      <AppearancePicker />

      {shouldShowHouseSetup(session?.role, snapshot.household.setupStep) ? (
        <HouseCard className="mt-6">
          <h2 className="type-section text-primary">Finish setup</h2>
          <p className="type-meta mt-1 text-muted-foreground">
            Invite, household size, nights, stores, budget, then create meals. Your place is saved.
          </p>
          <Button asChild size="fat" variant="primary" className="mt-3 w-full">
            <Link href="/week?setup=1">Finish house setup</Link>
          </Button>
        </HouseCard>
      ) : null}

      <HouseCard className="mt-6">
        <h2 className="type-section text-primary">Invite</h2>
        <p className="type-meta mt-1 text-muted-foreground">
          Share the link. They open it on their phone and join this house — Bot My Meals does not
          email anyone from here.
        </p>
        {owner ? (
          <InviteShare
            token={snapshot.joinToken ?? null}
            onRotate={() => createJoinToken(true).then(() => undefined)}
          />
        ) : (
          <p className="type-meta mt-3 text-muted-foreground">Ask an Admin to share the invite link.</p>
        )}
      </HouseCard>

      <ManagePeople />

      <PeoplePerNight
        household={snapshot.household}
        canEdit={owner}
        onChange={(patch) => void updateHousehold(patch)}
      />

      <HouseStores
        stores={snapshot.stores}
        canEdit={owner}
        postalCode={snapshot.household.postalCode}
        onPostalCode={(code) => void updateHousehold({ postalCode: code || null })}
        onAdd={(name) => void addStore(name)}
        onRemove={(id) => void removeStore(id)}
      />

      <HouseCard className="mt-6">
        <h2 className="type-section text-primary">Weekly meal budget</h2>
        <p className="type-meta mt-1 text-muted-foreground">
          A target for dinners this week. We never invent grocery prices.
        </p>
        {owner ? (
          <form
            className="mt-3 space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              setBudgetError(null);
              try {
                void updateHousehold({ weeklyBudgetCents: parseWeeklyBudgetDollars(budget) }).then(
                  () => setBudgetDraft(null),
                );
              } catch (err) {
                setBudgetError(err instanceof Error ? err.message : "Could not save that budget.");
              }
            }}
          >
            <Label htmlFor="house-weekly-budget">Weekly meal budget</Label>
            <WeeklyBudgetField
              id="house-weekly-budget"
              value={budget}
              postalCode={snapshot.household.postalCode}
              onChange={setBudgetDraft}
            />
            <Button size="fat" className="w-full">
              Save budget
            </Button>
            {budgetError ? <p className="type-meta text-destructive">{budgetError}</p> : null}
          </form>
        ) : (
          <p className="type-body mt-3">
            {snapshot.household.weeklyBudgetCents == null
              ? "No weekly target set."
              : `${weeklyBudgetCurrencyPrefix(snapshot.household.postalCode)}${formatWeeklyBudgetDollars(
                  snapshot.household.weeklyBudgetCents,
                )}`}
          </p>
        )}
      </HouseCard>

      <BotCheckFrequency
        mode={snapshot.household.botCheckMode}
        intervalHours={snapshot.household.botCheckIntervalHours}
        canEdit={owner}
        onChange={(patch) => updateHousehold(patch)}
      />

      {owner && snapshot.week.status === "locked" ? (
        <section className="mt-6 space-y-2">
          <Button variant="outline" size="fat" className="w-full" onClick={() => void unlockWeek()}>
            Unlock this week
          </Button>
        </section>
      ) : null}

      <p className="type-meta mt-8 text-center text-muted-foreground">
        Household-scoped by design. Other families cannot see this table.
      </p>
    </AppShell>
  );
}
