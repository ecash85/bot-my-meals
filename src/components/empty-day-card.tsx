"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import {
  ADD_SHEET_NOTE_LABEL,
  ADD_SHEET_PLACEHOLDER,
  ADD_SHEET_SEND,
  ADD_SHEET_TITLE,
  EMPTY_DAY_ADD,
  EMPTY_DAY_HELPER,
  EMPTY_DAY_TITLE,
  LOCKED_EMPTY_COPY,
  PENDING_ADD_CANCEL,
  PENDING_ADD_HELPER,
  PENDING_ADD_TITLE,
  SWAP_SHEET_CANCEL,
  addSheetHelper,
} from "@/lib/ballot";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { mealCardControlId } from "@/lib/dates";
import { AWAITING_MEAL_LABEL } from "@/lib/wake-feedback";
import { cn } from "@/lib/utils";

function renderEmptyDayBody({
  state,
  note,
  onAdd,
  onCancel,
  openAdd,
  cancelRequest,
}: {
  state: "empty" | "pending" | "locked" | "awaiting";
  note?: string;
  onAdd?: (note: string) => void | Promise<void>;
  onCancel?: () => void | Promise<void>;
  openAdd: () => void;
  cancelRequest: () => void;
}) {
  switch (state) {
    case "locked":
      return <h2 className="type-section mt-1">{LOCKED_EMPTY_COPY}</h2>;
    case "pending":
      return (
        <>
          <h2 className="type-section mt-1">{PENDING_ADD_TITLE}</h2>
          <p className="type-body mt-2 text-muted-foreground">{PENDING_ADD_HELPER}</p>
          {note ? <p className="type-meta mt-2 text-muted-foreground">{note}</p> : null}
          {onCancel ? (
            <Button
              type="button"
              variant="link"
              className="mt-3 h-auto min-h-12 px-0 text-base"
              onClick={() => cancelRequest()}
            >
              {PENDING_ADD_CANCEL}
            </Button>
          ) : null}
        </>
      );
    case "awaiting":
      return (
        <h2 data-slot="awaiting-meal" className="type-section mt-1 text-muted-foreground">
          {AWAITING_MEAL_LABEL}
        </h2>
      );
    case "empty":
      return (
        <>
          <h2 className="type-section mt-1">{EMPTY_DAY_TITLE}</h2>
          <p className="type-body mt-2 text-muted-foreground">{EMPTY_DAY_HELPER}</p>
          {onAdd ? (
            <Button
              type="button"
              size="fat"
              variant="outline"
              className="mt-4 w-full gap-2"
              onClick={openAdd}
            >
              <Plus className="size-5" />
              {EMPTY_DAY_ADD}
            </Button>
          ) : null}
        </>
      );
    default: {
      const _exhaustive: never = state;
      return _exhaustive;
    }
  }
}

export function EmptyDayCard({
  dayLabel,
  dayName,
  state,
  note,
  onAdd,
  onCancel,
}: {
  dayLabel: string;
  dayName: string;
  state: "empty" | "pending" | "locked" | "awaiting";
  note?: string;
  onAdd?: (note: string) => void | Promise<void>;
  onCancel?: () => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const noteFieldId = mealCardControlId("add-note", dayLabel);

  const requestDinner = () => {
    if (!onAdd) return;
    const pending = onAdd(draft.trim());
    setDraft("");
    setOpen(false);
    void Promise.resolve(pending).catch(() => undefined);
  };

  const cancelRequest = () => {
    if (!onCancel) return;
    void Promise.resolve(onCancel()).catch(() => undefined);
  };

  return (
    <article
      data-slot="empty-day-card"
      data-state={state}
      className={cn(
        "rounded-[14px] p-4",
        state === "locked"
          ? "bg-secondary text-secondary-foreground shadow-card"
          : state === "empty"
            ? "border border-dashed border-border bg-card text-card-foreground"
            : "bg-card text-card-foreground shadow-card",
      )}
    >
      <p
        data-slot="meal-day-label"
        className={cn(
          "type-day-label",
          state === "locked" ? "text-secondary-foreground/70" : "text-muted-foreground",
        )}
      >
        {dayLabel}
      </p>
      {renderEmptyDayBody({ state, note, onAdd, onCancel, openAdd: () => setOpen(true), cancelRequest })}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="rounded-t-[16px]"
        >
          <SheetHeader>
            <SheetTitle className="type-section">{ADD_SHEET_TITLE}</SheetTitle>
            <SheetDescription className="type-body">
              {addSheetHelper(dayName)}
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-2 px-4">
            <Label htmlFor={noteFieldId} className="type-meta text-muted-foreground">
              {ADD_SHEET_NOTE_LABEL}
            </Label>
            <Textarea
              id={noteFieldId}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={ADD_SHEET_PLACEHOLDER}
              className="min-h-24 rounded-[var(--radius-button)] text-base"
            />
          </div>
          <SheetFooter className="flex-row gap-2">
            <Button
              type="button"
              size="fat"
              variant="outline"
              className="flex-1"
              onClick={() => setOpen(false)}
            >
              {SWAP_SHEET_CANCEL}
            </Button>
            <Button
              type="button"
              size="fat"
              variant="primary"
              className="flex-1 shadow-float"
              onClick={() => requestDinner()}
            >
              {ADD_SHEET_SEND}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </article>
  );
}
