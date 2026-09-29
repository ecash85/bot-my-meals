import { mealCookPlan, type CookPlanInput } from "@/lib/cook-timing";
import { formatDuration } from "@/lib/duration";
import { formatQuantity } from "@/lib/shopping";
import type { Recipe } from "@/lib/types";

export function RecipeBlock({
  recipe,
  servings,
  title,
  cook,
}: {
  recipe?: Recipe;
  servings: number;
  title?: string;
  cook?: Omit<CookPlanInput, "recipe">;
}) {
  if (!recipe) {
    return (
      <div
        data-slot="recipe-block"
        data-empty="true"
        className="rounded-[14px] border border-dashed border-border bg-card p-5 shadow-card"
      >
        <h2 className="type-section">{title ?? "Recipe"}</h2>
        <p className="type-body mt-2 text-muted-foreground">
          No recipe was saved for this night. The shopping list only includes nights with ingredients.
        </p>
      </div>
    );
  }

  const plan = cook ? mealCookPlan({ ...cook, recipe }) : null;
  const total =
    plan?.totalMinutes ??
    recipe.prepMinutes + recipe.cookMinutes + (typeof recipe.restMinutes === "number" ? recipe.restMinutes : 0);
  const durationLabel = plan?.durationLabel ?? (total > 0 ? formatDuration(total) : null);
  const breakdown = plan?.breakdown ?? null;
  const startBy = plan?.startByLabel ?? null;
  const ahead = plan?.aheadLine ?? null;

  return (
    <div data-slot="recipe-block" className="space-y-6">
      {title ? <h2 className="type-section">{title}</h2> : null}
      {startBy ? (
        <p data-slot="start-by" className="type-body font-semibold">
          {startBy}
        </p>
      ) : null}
      {ahead ? (
        <p data-slot="ahead-line" className="type-meta -mt-4 text-muted-foreground">
          {ahead}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {durationLabel ? (
          <span
            data-slot="recipe-duration"
            className="type-chip inline-flex rounded-[var(--radius-chip)] bg-secondary px-2.5 py-1 text-foreground"
          >
            <span className="font-mono">{durationLabel}</span>
          </span>
        ) : null}
        <span
          data-slot="recipe-servings"
          className="type-chip inline-flex rounded-[var(--radius-chip)] bg-secondary px-2.5 py-1 text-foreground"
        >
          {servings > 0 ? (
            <>
              <span className="font-mono">{servings}</span>
              <span className="ml-1">{servings === 1 ? "serving" : "servings"}</span>
            </>
          ) : (
            "No dinner"
          )}
        </span>
      </div>
      {breakdown ? (
        <p data-slot="cook-breakdown" className="type-meta -mt-4 text-muted-foreground">
          {breakdown}
        </p>
      ) : null}
      <div>
        <h3 className="type-eyebrow text-muted-foreground">Ingredients</h3>
        <ul className="mt-2 divide-y divide-border rounded-[14px] bg-card shadow-card">
          {recipe.ingredients.map((ingredient) => (
            <li key={ingredient.id} className="flex min-h-12 items-center justify-between gap-3 px-4">
              <span className="type-body">{ingredient.name}</span>
              <span className="type-meta font-mono text-muted-foreground">
                {formatQuantity(ingredient.quantity, ingredient.unit)}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h3 className="type-eyebrow text-muted-foreground">Steps</h3>
        <ol className="mt-3 space-y-3">
          {recipe.steps.map((step, index) => (
            <li key={`${index}-${step}`} className="flex gap-3">
              <span className="type-chip mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-secondary font-semibold text-foreground">
                {index + 1}
              </span>
              <p className="type-body leading-relaxed">{step}</p>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

export const RecipeView = RecipeBlock;
