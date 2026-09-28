"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { BallotToast } from "@/components/ballot-toast";
import { useBotWakeConfigured, useWakeNow } from "@/components/use-bot-wake";
import { Button } from "@/components/ui/button";
import { POST_LOCK_GET_RECIPES_WAKE_HINT, RECIPE_PENDING_WAKE_HINT } from "@/lib/bot-wake";
import type { WakeClientResult } from "@/lib/bot-wake-client";
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
  wakeConfigured,
  onGetRecipes,
  className,
}: {
  mode: BotCheckMode;
  intervalHours: BotCheckIntervalHours | null;
  lastCheckedAt?: string | null;
  showTitle?: boolean;
  showBody?: boolean;
  wakeConfigured?: boolean;
  onGetRecipes?: () => void | Promise<WakeClientResult | void>;
  className?: string;
}) {
  const now = useCadenceNow(lastCheckedAt);
  const cadence = postLockWaitingCadenceLine({ mode, intervalHours, lastCheckedAt, now });
  const configured = useBotWakeConfigured(wakeConfigured);
  const { busy, message, dismiss, wake } = useWakeNow(onGetRecipes);
  const hint = configured ? POST_LOCK_GET_RECIPES_WAKE_HINT : POST_LOCK_GET_RECIPES_HINT;

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
      <div data-slot="post-lock-get-recipes" data-wake={configured ? "on" : "off"}>
        {configured ? (
          <Button
            type="button"
            variant="secondary"
            size="fat"
            className="mt-4 w-full"
            disabled={busy}
            aria-busy={busy}
            onClick={wake}
          >
            {POST_LOCK_GET_RECIPES_LABEL}
          </Button>
        ) : (
          <p className="type-body mt-4 font-semibold">{POST_LOCK_GET_RECIPES_LABEL}</p>
        )}
        <p className="type-meta mt-1 text-muted-foreground">{hint}</p>
      </div>
      <BallotToast message={message} onDismiss={dismiss} />
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
  wakeConfigured,
  className,
}: {
  mode: BotCheckMode;
  intervalHours: BotCheckIntervalHours | null;
  lastCheckedAt?: string | null;
  wakeConfigured?: boolean;
  className?: string;
}) {
  return (
    <div
      data-slot="post-lock-waiting"
      className={cn("rounded-[14px] bg-card p-4 shadow-card ring-1 ring-primary/20", className)}
    >
      <PostLockWaitingDetails
        mode={mode}
        intervalHours={intervalHours}
        lastCheckedAt={lastCheckedAt}
        wakeConfigured={wakeConfigured}
      />
    </div>
  );
}

export function PostLockWaitingSheet({
  open,
  onOpenChange,
  mode,
  intervalHours,
  lastCheckedAt = null,
  wakeConfigured,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: BotCheckMode;
  intervalHours: BotCheckIntervalHours | null;
  lastCheckedAt?: string | null;
  wakeConfigured?: boolean;
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
          wakeConfigured={wakeConfigured}
          className="px-4 pb-2"
        />
      </SheetContent>
    </Sheet>
  );
}

export function RecipePendingNotice({
  wakeConfigured,
  onWake,
}: {
  wakeConfigured?: boolean;
  onWake?: () => void | Promise<WakeClientResult | void>;
}) {
  const configured = useBotWakeConfigured(wakeConfigured);
  const { busy, message, dismiss, wake } = useWakeNow(onWake);
  const hint = configured ? RECIPE_PENDING_WAKE_HINT : RECIPE_PENDING_HINT;

  return (
    <div data-slot="recipe-pending" data-wake={configured ? "on" : "off"} className="rounded-[14px] bg-card p-5 shadow-card">
      <h2 className="type-section">{RECIPE_PENDING_TITLE}</h2>
      <p className="type-body mt-2 text-muted-foreground">{RECIPE_PENDING_BODY}</p>
      {configured ? (
        <Button
          type="button"
          variant="secondary"
          size="fat"
          className="mt-4 w-full"
          disabled={busy}
          aria-busy={busy}
          data-slot="recipe-pending-hint"
          onClick={wake}
        >
          {hint}
        </Button>
      ) : (
        <p data-slot="recipe-pending-hint" className="type-meta mt-3 text-muted-foreground">
          {hint}
        </p>
      )}
      <BallotToast message={message} onDismiss={dismiss} />
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
