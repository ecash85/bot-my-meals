"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  POST_LOCK_BOT_CHECK_SETTINGS,
  POST_LOCK_GET_RECIPES_HINT,
  POST_LOCK_GET_RECIPES_LABEL,
  POST_LOCK_WAITING_BODY,
  POST_LOCK_WAITING_TITLE,
  RECIPE_PENDING_BODY,
  RECIPE_PENDING_HINT,
  RECIPE_PENDING_TITLE,
  postLockWaitingCadenceLine,
  type LockedDinnerTap,
} from "@/lib/post-lock-waiting";
import type { BotCheckIntervalHours, BotCheckMode } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

function useCadenceNow(lastCheckedAt: string | null | undefined): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    if (!lastCheckedAt) return;
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, [lastCheckedAt]);
  return now;
}

export function PostLockWaitingDetails({
  mode,
  intervalHours,
  lastCheckedAt = null,
  showTitle = true,
  showBody = true,
  className,
}: {
  mode: BotCheckMode;
  intervalHours: BotCheckIntervalHours | null;
  lastCheckedAt?: string | null;
  showTitle?: boolean;
  showBody?: boolean;
  className?: string;
}) {
  const now = useCadenceNow(lastCheckedAt);
  const cadence = postLockWaitingCadenceLine({ mode, intervalHours, lastCheckedAt, now });

  return (
    <div className={className}>
      {showTitle ? (
        <h2 data-slot="post-lock-waiting-title" className="type-section text-primary">
          {POST_LOCK_WAITING_TITLE}
        </h2>
      ) : null}
      {showBody ? (
        <p className={cn("type-body text-muted-foreground", showTitle && "mt-2")}>{POST_LOCK_WAITING_BODY}</p>
      ) : null}
      <p data-slot="post-lock-cadence" className="type-meta mt-3 text-foreground">
        {cadence}
      </p>
      <p data-slot="post-lock-get-recipes" className="type-body mt-4 font-semibold">
        {POST_LOCK_GET_RECIPES_LABEL}
      </p>
      <p className="type-meta mt-1 text-muted-foreground">{POST_LOCK_GET_RECIPES_HINT}</p>
      <Link
        href="/settings#bot-check"
        data-slot="post-lock-bot-settings"
        className="type-meta mt-4 inline-flex min-h-12 items-center font-semibold text-primary"
      >
        {POST_LOCK_BOT_CHECK_SETTINGS}
      </Link>
    </div>
  );
}

export function PostLockWaitingCard({
  mode,
  intervalHours,
  lastCheckedAt = null,
  className,
}: {
  mode: BotCheckMode;
  intervalHours: BotCheckIntervalHours | null;
  lastCheckedAt?: string | null;
  className?: string;
}) {
  return (
    <div
      data-slot="post-lock-waiting"
      className={cn("rounded-[14px] bg-card p-4 shadow-card ring-1 ring-primary/20", className)}
    >
      <PostLockWaitingDetails mode={mode} intervalHours={intervalHours} lastCheckedAt={lastCheckedAt} />
    </div>
  );
}

export function PostLockWaitingSheet({
  open,
  onOpenChange,
  mode,
  intervalHours,
  lastCheckedAt = null,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: BotCheckMode;
  intervalHours: BotCheckIntervalHours | null;
  lastCheckedAt?: string | null;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" showCloseButton className="rounded-t-[16px]" data-waiting-sheet="true">
        <SheetHeader>
          <SheetTitle className="type-section pr-8 text-left text-primary">{POST_LOCK_WAITING_TITLE}</SheetTitle>
          <SheetDescription className="type-body text-muted-foreground">{POST_LOCK_WAITING_BODY}</SheetDescription>
        </SheetHeader>
        <PostLockWaitingDetails
          mode={mode}
          intervalHours={intervalHours}
          lastCheckedAt={lastCheckedAt}
          showTitle={false}
          showBody={false}
          className="px-4 pb-2"
        />
      </SheetContent>
    </Sheet>
  );
}

export function RecipePendingNotice() {
  return (
    <div data-slot="recipe-pending" className="rounded-[14px] bg-card p-5 shadow-card">
      <h2 className="type-section">{RECIPE_PENDING_TITLE}</h2>
      <p className="type-body mt-2 text-muted-foreground">{RECIPE_PENDING_BODY}</p>
      <p data-slot="recipe-pending-hint" className="type-meta mt-3 text-muted-foreground">
        {RECIPE_PENDING_HINT}
      </p>
    </div>
  );
}

export function LockedNightFrame({
  tap,
  href,
  title,
  onWaiting,
  children,
}: {
  tap: LockedDinnerTap;
  href: string;
  title: string;
  onWaiting: () => void;
  children: ReactNode;
}) {
  switch (tap) {
    case "none":
      return children;
    case "waiting":
      return (
        <button
          type="button"
          data-slot="locked-night-waiting"
          className="block w-full border-0 bg-transparent p-0 text-left font-[inherit] text-inherit"
          aria-label={`${title}. ${POST_LOCK_WAITING_TITLE}`}
          onClick={onWaiting}
        >
          {children}
        </button>
      );
    case "recipe":
      return (
        <Link href={href} data-slot="locked-night-recipe" className="block">
          {children}
        </Link>
      );
    default: {
      const _exhaustive: never = tap;
      return _exhaustive;
    }
  }
}
