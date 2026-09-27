"use client";

import { AppShell } from "@/components/app-shell";
import { AuthGate } from "@/components/auth-gate";
import { ListRow } from "@/components/list-row";
import { LockFirstEmpty } from "@/components/lock-first-empty";
import { PostLockWaitingCard } from "@/components/post-lock-waiting";
import { StatusStrip } from "@/components/status-strip";
import { useSupper } from "@/components/supper-provider";
import { formatWeekEyebrow } from "@/lib/dates";
import { isNightOff } from "@/lib/lock";
import {
  LIST_LOCKED_SECONDARY,
  LIST_NO_HOUSEHOLD,
  LIST_NOTHING_TO_BUY,
  LIST_PRE_LOCK_DESCRIPTION,
  LOCK_FIRST_TITLE,
} from "@/lib/lock-success";
import { isPendingBotFill } from "@/lib/post-lock-waiting";
import { recipeNightsForWeek } from "@/lib/recipes";
import { groupStickyStoreLists, listItemDisplay } from "@/lib/shopping";

export default function ListPage() {
  return (
    <AuthGate>
      <ListBody />
    </AuthGate>
  );
}

function ListBody() {
  const { snapshot, toggleItem } = useSupper();
  if (!snapshot) {
    return (
      <AppShell title="Shopping list">
        <p className="type-body text-muted-foreground">{LIST_NO_HOUSEHOLD}</p>
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

  if (!locked) {
    return (
      <AppShell title="Shopping list" eyebrow={formatWeekEyebrow(snapshot.week.startsOn)}>
        <LockFirstEmpty
          title={LOCK_FIRST_TITLE}
          description={LIST_PRE_LOCK_DESCRIPTION}
          meals={nights}
          removedMealIds={removedMealIds}
        />
      </AppShell>
    );
  }

  const list = snapshot.shoppingList;
  if (pendingFill && (!list || list.items.length === 0)) {
    return (
      <AppShell title="Shopping list" eyebrow={formatWeekEyebrow(snapshot.week.startsOn, true)}>
        <PostLockWaitingCard
          mode={snapshot.household.botCheckMode}
          intervalHours={snapshot.household.botCheckIntervalHours}
        />
      </AppShell>
    );
  }

  if (!list || list.items.length === 0) {
    return (
      <AppShell title="Shopping list" eyebrow={formatWeekEyebrow(snapshot.week.startsOn, true)}>
        <div className="rounded-[14px] border border-dashed border-border bg-card p-5 shadow-card">
          <h2 className="type-section">Nothing to buy</h2>
          <p className="type-body mt-2 text-muted-foreground">{LIST_NOTHING_TO_BUY}</p>
        </div>
      </AppShell>
    );
  }

  const groups = groupStickyStoreLists(list.items, snapshot.stores);

  return (
    <AppShell
      title="Shopping list"
      eyebrow={formatWeekEyebrow(snapshot.week.startsOn, true)}
      status={<StatusStrip state="locked" people={[]} secondary={LIST_LOCKED_SECONDARY} />}
    >
      <div className="space-y-8">
        {groups.map((group) => (
          <section key={group.store.id} data-slot="list-store-section">
            <h2
              data-slot="list-store"
              data-store={group.store.slug}
              className="type-eyebrow sticky z-10 -mx-4 bg-card/95 px-4 py-2 text-primary shadow-card backdrop-blur-md"
              style={{ top: "var(--shell-head-h, 5.5rem)" }}
            >
              {group.label}
            </h2>
            <ul className="divide-y divide-border">
              {group.items.map((item) => {
                const display = listItemDisplay(item);
                return (
                  <ListRow
                    key={item.id}
                    name={display.name}
                    quantity={display.quantity}
                    checked={item.checked}
                    onCheckedChange={(checked) => void toggleItem(item.id, checked)}
                  />
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </AppShell>
  );
}
