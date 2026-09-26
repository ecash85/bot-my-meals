import { formatQuantity } from "@/lib/shopping";
import type { Recipe } from "@/lib/types";

export function RecipeBlock({
  recipe,
  servings,
  title,
}: {
  recipe?: Recipe;
  servings: number;
  title?: string;
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

  const minutes = recipe.prepMinutes + recipe.cookMinutes;

  return (
    <div data-slot="recipe-block" className="space-y-6">
      {title ? <h2 className="type-section">{title}</h2> : null}
      <div className="flex flex-wrap gap-2">
        <span className="type-chip inline-flex rounded-[var(--radius-chip)] bg-secondary px-2.5 py-1 text-foreground">
          <span className="font-mono">{minutes}</span>
          <span className="ml-1">min</span>
        </span>
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
