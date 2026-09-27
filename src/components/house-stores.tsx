"use client";

import { useState } from "react";
import { HouseCard } from "@/components/house-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  classifyPostalCode,
  grocersForPostalCode,
  normalizePostalCode,
  storeMatchesGrocer,
} from "@/lib/grocers";
import type { Store } from "@/lib/types";

export function HouseStores({
  stores,
  canEdit,
  helper,
  postalCode,
  onPostalCode,
  onAdd,
  onRemove,
}: {
  stores: Store[];
  canEdit: boolean;
  helper?: string;
  postalCode?: string | null;
  onPostalCode?: (code: string) => void | Promise<void>;
  onAdd: (name: string) => void | Promise<void>;
  onRemove: (storeId: string) => void | Promise<void>;
}) {
  const [storeName, setStoreName] = useState("");
  const [postalDraft, setPostalDraft] = useState<string | null>(null);
  const postal = postalDraft ?? postalCode ?? "";
  const suggestions = grocersForPostalCode(postal);

  const persistPostal = (value: string) => {
    const next = value.trim() ? normalizePostalCode(value) : "";
    setPostalDraft(next);
    if (onPostalCode) void onPostalCode(next);
  };

  const addCustomStore = () => {
    const name = storeName.trim();
    if (!name) return;
    void onAdd(name);
    setStoreName("");
  };

  return (
    <HouseCard className="mt-6" data-slot="house-stores">
      <h2 className="type-section text-primary">Stores</h2>
      {helper ? <p className="type-meta mt-1 text-muted-foreground">{helper}</p> : null}

      <div className="mt-3 space-y-1.5">
        <Label htmlFor="store-zip">Zip or postal code</Label>
        <Input
          id="store-zip"
          value={postal}
          onChange={(event) => {
            const value = event.target.value;
            setPostalDraft(value);
            if (classifyPostalCode(value).kind !== "unknown") persistPostal(value);
          }}
          onBlur={() => persistPostal(postal)}
          className="h-12 min-h-12 rounded-[var(--radius-button)] bg-card"
          aria-label="Zip or postal code"
          autoComplete="postal-code"
          inputMode="text"
        />
      </div>

      {suggestions.length ? (
        <ul data-slot="region-grocers" className="mt-3 flex flex-wrap gap-2">
          {suggestions.map((grocer) => {
            const selected = stores.some((store) => storeMatchesGrocer(store, grocer));
            return (
              <li key={grocer.slug}>
                <Button
                  type="button"
                  size="fat"
                  variant={selected ? "primary" : "outline"}
                  aria-pressed={selected}
                  disabled={!canEdit}
                  onClick={() => {
                    if (!canEdit) return;
                    if (selected) {
                      const match = stores.find((store) => storeMatchesGrocer(store, grocer));
                      if (match) void onRemove(match.id);
                      return;
                    }
                    void onAdd(grocer.name);
                  }}
                >
                  {grocer.name}
                </Button>
              </li>
            );
          })}
        </ul>
      ) : postal.trim() ? (
        <p className="type-meta mt-3 text-muted-foreground">
          No curated grocers for that region. Add a store below.
        </p>
      ) : (
        <p className="type-meta mt-3 text-muted-foreground">
          Enter a zip or postal code to see grocers for your region.
        </p>
      )}

      <ul className="mt-3 space-y-2">
        {stores.map((store) => (
          <li
            key={store.id}
            className="flex min-h-12 items-center justify-between gap-3 rounded-[14px] bg-secondary px-4 py-2"
          >
            <span className="type-body font-medium">{store.name}</span>
            {canEdit ? (
              <Button
                type="button"
                variant="outline"
                size="fat"
                className="text-destructive"
                onClick={() => void onRemove(store.id)}
              >
                Remove
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
      {canEdit ? (
        <div className="mt-3 flex gap-2">
          <Input
            value={storeName}
            onChange={(event) => setStoreName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              event.preventDefault();
              event.stopPropagation();
              addCustomStore();
            }}
            placeholder="Add a store"
            className="h-12 min-h-12 rounded-[var(--radius-button)] bg-card"
            aria-label="Store name"
          />
          <Button type="button" size="fat" onClick={() => addCustomStore()}>
            Add
          </Button>
        </div>
      ) : null}
    </HouseCard>
  );
}
