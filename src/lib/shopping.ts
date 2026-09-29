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

/** Sticky section titles. Trader Joe's and Smith's keep catalog labels; every other store uses its name. Never a cart. */
export const STORE_LABEL_TRADER_JOES = "Trader Joe's";
export const STORE_LABEL_SMITHS = "Smith's";
export const STORE_LABEL_OTHER = "Other";

/** Stable id for items whose store_id is not a household store. Not a household_stores row. */
export const OTHER_STORE_SECTION_ID = "__other__";

export function listStoreLabel(store: Pick<Store, "slug" | "name">): string {
  switch (store.slug) {
    case "trader-joes":
    case "trader-joe-s":
      return STORE_LABEL_TRADER_JOES;
    case "smiths":
    case "smith-s":
      return STORE_LABEL_SMITHS;
    default: {
      const name = store.name.trim();
      return name || store.slug;
    }
  }
}

/** Every household store, in sort order, including stores with nothing to buy. */
export function groupItemsByStore(
  items: ShoppingItem[],
  stores: Store[],
): Array<{ store: Store; items: ShoppingItem[] }> {
  const sortedStores = [...stores].sort((a, b) => a.sortOrder - b.sortOrder);
  return sortedStores.map((store) => ({
    store,
    items: items
      .filter((item) => item.storeId === store.id)
      .sort((a, b) => a.name.localeCompare(b.name)),
  }));
}

/** Post-lock sticky sections. One section per household store, then Other for unmatched store ids. */
export function groupStickyStoreLists(
  items: ShoppingItem[],
  stores: Store[],
): Array<{ store: Store; label: string; items: ShoppingItem[] }> {
  const known = new Set(stores.map((store) => store.id));
  const groups = groupItemsByStore(items, stores).map((group) => ({
    ...group,
    label: listStoreLabel(group.store),
  }));

  const otherItems = items
    .filter((item) => !known.has(item.storeId))
    .sort((a, b) => a.name.localeCompare(b.name));
  if (otherItems.length === 0) return groups;

  const householdId = stores[0]?.householdId ?? otherItems[0]?.householdId ?? "";
  return [
    ...groups,
    {
      store: {
        id: OTHER_STORE_SECTION_ID,
        householdId,
        name: STORE_LABEL_OTHER,
        slug: "other",
        sortOrder: Number.MAX_SAFE_INTEGER,
      },
      label: STORE_LABEL_OTHER,
      items: otherItems,
    },
  ];
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
