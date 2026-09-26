import { weekdayShortFromNight } from "@/lib/dates";
import { recipeNightsForWeek } from "@/lib/recipes";
import type { Meal } from "@/lib/types";

export function LockFirstEmpty({
  title,
  description,
  meals,
  removedMealIds,
}: {
  title: string;
  description: string;
  meals: Meal[];
  removedMealIds?: Set<string>;
}) {
  const nights = recipeNightsForWeek(meals);

  return (
    <div className="rounded-[14px] border border-dashed border-border bg-card p-5 shadow-card">
      <h2 className="type-section">{title}</h2>
      <p className="type-body mt-2 text-muted-foreground">{description}</p>
      {nights.length > 0 ? (
        <>
          <p className="type-eyebrow mt-5 text-muted-foreground">Titles only</p>
          <ol className="mt-2 space-y-2">
            {nights.map((meal) => (
              <li
                key={meal.id}
                className="flex min-h-12 items-center gap-3 rounded-[14px] bg-secondary px-4 py-2"
              >
                <span className="type-eyebrow w-10 shrink-0 text-muted-foreground">
                  {weekdayShortFromNight(meal.nightDate)}
                </span>
                <span className="type-body font-semibold">{meal.title}</span>
                {removedMealIds?.has(meal.id) ? (
                  <span className="type-meta ml-auto text-muted-foreground">removed</span>
                ) : null}
              </li>
            ))}
          </ol>
        </>
      ) : (
        <p className="type-body mt-4 text-muted-foreground">No dinners on this week yet.</p>
      )}
    </div>
  );
}
