"use client";

import { useEffect } from "react";
import { cn } from "@/lib/utils";

export function BallotToast({
  message,
  onDismiss,
}: {
  message?: string;
  onDismiss: () => void;
}) {
  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(onDismiss, 3200);
    return () => window.clearTimeout(timer);
  }, [message, onDismiss]);

  if (!message) return null;

  return (
    <div
      data-slot="ballot-toast"
      role="status"
      aria-live="polite"
      className={cn(
        "fixed inset-x-4 z-40 mx-auto max-w-lg rounded-[14px] bg-card px-4 py-3 shadow-float",
        "bottom-[calc(4.5rem+env(safe-area-inset-bottom))]",
      )}
    >
      <p className="type-body text-foreground">{message}</p>
    </div>
  );
}
