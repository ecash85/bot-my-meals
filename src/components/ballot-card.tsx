"use client";

import { useState } from "react";
import { CircleMinus, RefreshCw } from "lucide-react";
import {
  REMOVE_CONFIRM_ACTION,
  REMOVE_CONFIRM_KEEP,
  REMOVE_CONFIRM_TITLE,
  SWAP_REQUESTED,
  SWAP_SHEET_CANCEL,
  SWAP_SHEET_HELPER,
  SWAP_SHEET_PLACEHOLDER,
  SWAP_SHEET_REASON_LABEL,
  SWAP_SHEET_SEND,
  SWAP_SHEET_TITLE,
  removeDinnerBody,
  voteActionLabel,
} from "@/lib/ballot";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { cn } from "@/lib/utils";

export function BallotCard({
  dayLabel,
  confirmDayLabel,
  title,
  pitch,
  servings,
  swapped = false,
  swapNote,
  muted = false,
  locked = false,
  onSwap,
  onRemove,
  className,
}: {
  dayLabel: string;
  confirmDayLabel?: string;
  title: string;
  pitch?: string;
  servings?: number;
  swapped?: boolean;
  swapNote?: string;
  muted?: boolean;
  locked?: boolean;
  onSwap?: (reason: string) => void | Promise<void>;
  onRemove?: () => void | Promise<void>;
  className?: string;
}) {
  const [sheet, setSheet] = useState<"swap" | "remove" | null>(null);
  const [reason, setReason] = useState(swapNote ?? "");
  const canAct = Boolean(onSwap || onRemove) && !locked;
  const swapFieldId = mealCardControlId("swap-reason", dayLabel);

  const sendSwap = () => {
    if (!onSwap) return;
    const pending = onSwap(reason.trim());
    setSheet(null);
    void Promise.resolve(pending).catch(() => undefined);
  };

  const confirmRemove = () => {
    if (!onRemove) return;
    const pending = onRemove();
    setSheet(null);
    void Promise.resolve(pending).catch(() => undefined);
  };

  return (
    <article
      data-slot="ballot-card"
      data-swapped={swapped ? "true" : "false"}
      data-muted={muted ? "true" : "false"}
      className={cn(
        "rounded-[14px] p-4 shadow-card",
        muted ? "bg-secondary text-secondary-foreground" : "bg-card text-card-foreground",
        className,
      )}
    >
      <p
        data-slot="meal-day-label"
        className={cn(
          "type-day-label",
          muted ? "text-secondary-foreground/70" : "text-muted-foreground",
        )}
      >
        {dayLabel}
      </p>
      <h2 className="type-section mt-1">{title}</h2>
      {pitch ? (
        <p
          className={cn(
            "type-body mt-2 line-clamp-2",
            muted ? "text-secondary-foreground/80" : "text-muted-foreground",
          )}
        >
          {pitch}
        </p>
      ) : null}
      {servings != null && servings > 0 ? (
        <p
          className={cn(
            "type-chip mt-3 inline-flex rounded-[var(--radius-chip)] px-2.5 py-1",
            muted ? "bg-background/40 text-secondary-foreground" : "bg-muted text-muted-foreground",
          )}
        >
          <span className="font-mono">{servings}</span>
          <span className="ml-1">{servings === 1 ? "serving" : "servings"}</span>
        </p>
      ) : servings === 0 ? (
        <p
          className={cn(
            "type-chip mt-3 inline-flex rounded-[var(--radius-chip)] px-2.5 py-1",
            muted ? "bg-background/40 text-secondary-foreground" : "bg-muted text-muted-foreground",
          )}
        >
          No dinner
        </p>
      ) : null}
      {swapped ? (
        <div className="mt-3 space-y-1">
          <p className="type-meta text-swap">{SWAP_REQUESTED}</p>
          {swapNote ? <p className="type-body text-muted-foreground">{swapNote}</p> : null}
        </div>
      ) : null}
      {canAct ? (
        <div className="mt-4 flex gap-2" role="group" aria-label={`Vote on ${title}`}>
          {onSwap ? (
            <Button
              type="button"
              size="vote"
              variant={swapped ? "swap" : "outline"}
              className="gap-2"
              aria-pressed={swapped}
              aria-label={voteActionLabel("swap", title)}
              onClick={() => {
                setReason(swapNote ?? "");
                setSheet("swap");
              }}
            >
              <RefreshCw className="size-5 shrink-0" />
              Swap
            </Button>
          ) : null}
          {onRemove ? (
            <Button
              type="button"
              size="vote"
              variant="outline"
              className="gap-2"
              aria-label={voteActionLabel("remove", title)}
              onClick={() => setSheet("remove")}
            >
              <CircleMinus className="size-5 shrink-0" />
              Remove
            </Button>
          ) : null}
        </div>
      ) : null}

      <Sheet open={sheet === "swap"} onOpenChange={(open) => setSheet(open ? "swap" : null)}>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="rounded-t-[16px]"
        >
          <SheetHeader>
            <SheetTitle className="type-section">{SWAP_SHEET_TITLE}</SheetTitle>
            <SheetDescription className="type-body">{SWAP_SHEET_HELPER}</SheetDescription>
          </SheetHeader>
          <div className="space-y-2 px-4">
            <Label htmlFor={swapFieldId} className="type-meta text-muted-foreground">
              {SWAP_SHEET_REASON_LABEL}
            </Label>
            <Textarea
              id={swapFieldId}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder={SWAP_SHEET_PLACEHOLDER}
              className="min-h-16 max-h-32 overflow-y-auto rounded-[var(--radius-button)] text-base"
            />
          </div>
          <SheetFooter className="flex-row gap-2">
            <Button
              type="button"
              size="fat"
              variant="outline"
              className="flex-1"
              onClick={() => setSheet(null)}
            >
              {SWAP_SHEET_CANCEL}
            </Button>
            <Button
              type="button"
              size="fat"
              variant="primary"
              className="flex-1"
              onClick={() => sendSwap()}
            >
              {SWAP_SHEET_SEND}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Dialog open={sheet === "remove"} onOpenChange={(open) => setSheet(open ? "remove" : null)}>
        <DialogContent showCloseButton={false} className="rounded-[14px]">
          <DialogHeader>
            <DialogTitle className="type-section">{REMOVE_CONFIRM_TITLE}</DialogTitle>
            <DialogDescription className="type-body">
              {removeDinnerBody(confirmDayLabel ?? dayLabel)}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              size="fat"
              variant="skip"
              className="w-full"
              onClick={() => confirmRemove()}
            >
              {REMOVE_CONFIRM_ACTION}
            </Button>
            <Button
              type="button"
              size="fat"
              variant="outline"
              className="w-full"
              onClick={() => setSheet(null)}
            >
              {REMOVE_CONFIRM_KEEP}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </article>
  );
}
