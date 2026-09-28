import { Bookmark } from "lucide-react";
import { SAVE_LABEL, SAVE_WAIT_TIP, SAVED_LABEL, type MealSaveAvailability } from "@/lib/saved-meals";
import { cn } from "@/lib/utils";

export function SaveMealControl({
  availability,
  saved,
  canAct,
  onToggle,
}: {
  availability: MealSaveAvailability;
  saved: boolean;
  canAct: boolean;
  onToggle: () => void;
}) {
  if (availability === "hidden") return null;
  if (availability === "wait") {
    return (
      <div data-slot="save-meal-wait" className="flex flex-col items-start gap-1">
        <button
          type="button"
          disabled
          aria-disabled="true"
          className="tap-target inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-card px-4 text-sm font-semibold text-muted-foreground opacity-60"
        >
          <Bookmark aria-hidden className="size-4" />
          {SAVE_LABEL}
        </button>
        <p className="type-meta text-muted-foreground">{SAVE_WAIT_TIP}</p>
      </div>
    );
  }
  if (!canAct) return null;

  return (
    <button
      type="button"
      data-slot="save-meal"
      aria-pressed={saved}
      onClick={onToggle}
      className={cn(
        "tap-target inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-semibold",
        saved
          ? "border-transparent bg-primary text-primary-foreground"
          : "border-border bg-card text-foreground",
      )}
    >
      <Bookmark aria-hidden className={cn("size-4", saved && "fill-current")} />
      {saved ? SAVED_LABEL : SAVE_LABEL}
    </button>
  );
}
