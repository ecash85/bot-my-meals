"use client";

import { useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import {
  canUseNativeShare,
  joinUrl,
  shareJoinInvite,
} from "@/lib/join";

function subscribeNever() {
  return () => {};
}

function readOrigin() {
  return window.location.origin;
}

function readServerOrigin() {
  return "";
}

export function InviteShare({
  token,
  onRotate,
}: {
  token: string | null;
  onRotate?: () => Promise<void>;
}) {
  const origin = useSyncExternalStore(subscribeNever, readOrigin, readServerOrigin);
  const [shareState, setShareState] = useState<"idle" | "shared" | "copied">("idle");
  const [busy, setBusy] = useState(false);
  const nativeShare = canUseNativeShare();
  const url = token && origin ? joinUrl(origin, token) : "";

  return (
    <div data-slot="invite-share">
      {url ? (
        <p className="type-body mt-3 break-all font-medium text-foreground">{url}</p>
      ) : (
        <p className="type-meta mt-3 text-muted-foreground">Making a textable invite link…</p>
      )}
      <Button
        type="button"
        size="fat"
        variant="primary"
        className="mt-3 w-full"
        disabled={!url || busy}
        aria-label={nativeShare ? "Share invite link" : "Copy invite link"}
        onClick={async () => {
          if (!url) return;
          setBusy(true);
          try {
            const result = await shareJoinInvite(url);
            setShareState(result);
          } catch (err) {
            if (err instanceof Error && err.name === "AbortError") return;
            setShareState("copied");
          } finally {
            setBusy(false);
          }
        }}
      >
        {shareState === "shared"
          ? "Opened share sheet"
          : shareState === "copied"
            ? "Link copied"
            : nativeShare
              ? "Share invite link"
              : "Copy invite link"}
      </Button>
      {onRotate ? (
        <Button
          type="button"
          size="fat"
          variant="outline"
          className="mt-2 w-full"
          disabled={busy}
          onClick={() => void onRotate()}
        >
          Make a new link
        </Button>
      ) : null}
    </div>
  );
}
