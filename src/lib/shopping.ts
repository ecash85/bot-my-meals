import { isNightOff } from "./lock";
import type { Meal, Recipe, ShoppingItem, Store, Vote } from "./types";

export function normalizeItemName(name: string): string {
  return name.toLowerCase().replace(/\s+/g, " ").trim();
}

export function mergeQuantities(items: ShoppingItem[]): ShoppingItem[] {
  const groups = new Map<string, ShoppingItem>();

  for (const item of items) {
    const key = `${item.storeId}::${normalizeItemName(item.name)}::${item.unit.toLowerCase()}`;
    const existing = groups.get(key);
    if (!existing) {
      groups.set(key, { ...item });
      continue;
    }
    existing.quantity = roundQuantity(existing.quantity + item.quantity);
    if (!existing.priceCents && item.priceCents != null) {
      existing.priceCents = item.priceCents;
      existing.priceSource = item.priceSource;
      existing.pricedAt = item.pricedAt;
    }
  }

  return [...groups.values()];
}

export function roundQuantity(value: number): number {
  return Math.round(value * 100) / 100;
}

export function buildShoppingItems(input: {
  householdId: string;
  shoppingListId: string;
  meals: Meal[];
  recipes: Recipe[];
  votes: Vote[];
}): ShoppingItem[] {
  const draft: ShoppingItem[] = [];

  for (const meal of input.meals) {
    if (isNightOff(meal.id, input.votes)) continue;
    const recipe = input.recipes.find((item) => item.mealId === meal.id);
    if (!recipe) continue;

    for (const ingredient of recipe.ingredients) {
      draft.push({
        id: `shop_${meal.id}_${ingredient.id}`,
        householdId: input.householdId,
        shoppingListId: input.shoppingListId,
        storeId: ingredient.storeId,
        name: ingredient.name,
        quantity: ingredient.quantity,
        unit: ingredient.unit,
        priceCents: null,
        priceSource: null,
        pricedAt: null,
        checked: false,
      });
    }
  }

  return mergeQuantities(draft).map((item, index) => ({
    ...item,
    id: `${input.shoppingListId}_${index}`,
  }));
}

/** Locked-list sticky headers — Trader Joe’s / Smith’s only. Never Kroger or a cart. */
export const STORE_LABEL_TRADER_JOES = "Trader Joe's";
export const STORE_LABEL_SMITHS = "Smith's";

export function listStoreLabel(store: Pick<Store, "slug">): string | null {
  switch (store.slug) {
    case "trader-joes":
      return STORE_LABEL_TRADER_JOES;
    case "smiths":
      return STORE_LABEL_SMITHS;
    default:
      return null;
  }
}

export function groupItemsByStore(
  items: ShoppingItem[],
  stores: Store[],
): Array<{ store: Store; items: ShoppingItem[] }> {
  const sortedStores = [...stores].sort((a, b) => a.sortOrder - b.sortOrder);
  return sortedStores
    .map((store) => ({
      store,
      items: items
        .filter((item) => item.storeId === store.id)
        .sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .filter((group) => group.items.length > 0);
}

/** Post-lock sticky sections: known stores only, canonical labels. */
export function groupStickyStoreLists(
  items: ShoppingItem[],
  stores: Store[],
): Array<{ store: Store; label: string; items: ShoppingItem[] }> {
  return groupItemsByStore(items, stores).flatMap((group) => {
    const label = listStoreLabel(group.store);
    return label ? [{ ...group, label }] : [];
  });
}

export function formatQuantity(quantity: number, unit: string): string {
  const shown = Number.isInteger(quantity) ? String(quantity) : String(roundQuantity(quantity));
  return unit ? `${shown} ${unit}` : shown;
}

/** Name + qty only. Prices stay off the list even when a source exists in the model. */
export function listItemDisplay(item: Pick<ShoppingItem, "name" | "quantity" | "unit">): {
  name: string;
  quantity: string;
} {
  return {
    name: item.name,
    quantity: formatQuantity(item.quantity, item.unit),
  };
}
