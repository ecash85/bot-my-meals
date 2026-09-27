"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Utensils } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { BackendSetupGate } from "@/components/backend-setup-gate";
import { CheckEmailCard } from "@/components/check-email-card";
import { HouseCard } from "@/components/house-card";
import { useSupper } from "@/components/supper-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { JoinPeek, JoinTokenStatus } from "@/lib/join";
import {
  JOIN_CTA,
  JOIN_HELPER,
  JOIN_HOUSE_SAMPLE,
  JOIN_TITLE,
  isJoinTokenFormat,
  joinInviteBody,
  joinPath,
  joinTokenReason,
} from "@/lib/join";
import { LOGIN_SAME_DEVICE_COPY, LOGIN_SAME_DEVICE_HELPER } from "@/lib/login";

export function JoinLanding({ token }: { token: string }) {
  const {
    mode,
    ready,
    session,
    signInMagicLink,
    peekJoinToken,
    claimJoinToken,
  } = useSupper();
  const router = useRouter();
  const tokenLooksValid = isJoinTokenFormat(token);
  const [peek, setPeek] = useState<JoinPeek | null>(
    tokenLooksValid ? null : { status: "invalid" },
  );
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (mode === "setup" || !ready || !tokenLooksValid) return;
    let cancelled = false;
    void (async () => {
      try {
        const next = await peekJoinToken(token);
        if (!cancelled) setPeek(next);
      } catch {
        if (!cancelled) setPeek({ status: "invalid" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mode, peekJoinToken, ready, token, tokenLooksValid]);

  useEffect(() => {
    if (!ready || !session || peek?.status !== "ok") return;
    if (session.householdId && session.householdId === peek.householdId) {
      router.replace("/week");
    }
  }, [peek, ready, router, session]);

  useEffect(() => {
    if (!ready || !session || peek?.status !== "ok") return;
    if (session.householdId) return;
    let cancelled = false;
    void (async () => {
      setBusy(true);
      try {
        await claimJoinToken(token);
        if (!cancelled) router.replace("/week");
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not join this house.");
          setBusy(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [claimJoinToken, peek, ready, router, session, token]);

  if (mode === "setup") {
    return <BackendSetupGate />;
  }

  const status: JoinTokenStatus = peek?.status ?? "invalid";
  const reason = peek ? joinTokenReason(status) : "";
  const houseName = peek?.householdName?.trim() || JOIN_HOUSE_SAMPLE;

  const sendLink = async () => {
    setBusy(true);
    setError(null);
    try {
      await signInMagicLink(email.trim(), { next: joinPath(token) });
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send a link");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell title={JOIN_TITLE} eyebrow="Bot My Meals" hideNav>
      {sent ? (
        <div data-slot="join-landing">
          <CheckEmailCard
            email={email.trim()}
            busy={busy}
            onResend={() => void sendLink()}
            onDifferentEmail={() => {
              setSent(false);
              setError(null);
            }}
          />
          {error ? (
            <p className="type-meta mt-3 text-destructive" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      ) : (
      <HouseCard data-slot="join-landing">
        {!ready || peek == null ? (
          <p className="type-body text-muted-foreground" role="status">
            Opening invite…
          </p>
        ) : status !== "ok" ? (
          <div>
            <p className="type-body" role="alert">
              {reason}
            </p>
            <p className="type-meta mt-2 text-muted-foreground">
              Ask your partner to share a new invite link. There is no code to paste here.
            </p>
          </div>
        ) : session && session.householdId && session.householdId !== peek.householdId ? (
          <p className="type-body" role="alert">
            You are already in a house.
          </p>
        ) : session ? (
          <div className="flex flex-col items-center text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-secondary text-primary">
              <Utensils className="size-5" aria-hidden />
            </div>
            <p className="type-meta mt-3 inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-muted-foreground">
              {houseName}
            </p>
            <p className="type-body mt-4 text-muted-foreground">{joinInviteBody(houseName)}</p>
            <p className="type-meta mt-3 text-muted-foreground">{JOIN_HELPER}</p>
            <Button
              type="button"
              size="fat"
              variant="primary"
              className="mt-4 w-full"
              disabled={busy}
              aria-label={JOIN_CTA}
              onClick={async () => {
                setBusy(true);
                setError(null);
                try {
                  await claimJoinToken(token);
                  router.replace("/week");
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Could not join this house.");
                  setBusy(false);
                }
              }}
            >
              {busy ? "Joining…" : JOIN_CTA}
            </Button>
          </div>
        ) : (
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              void sendLink();
            }}
          >
            <div className="flex flex-col items-center text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-secondary text-primary">
                <Utensils className="size-5" aria-hidden />
              </div>
              <p className="type-meta mt-3 inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-muted-foreground">
                {houseName}
              </p>
              <p className="type-body mt-4 text-muted-foreground">{joinInviteBody(houseName)}</p>
              <p className="type-meta mt-3 text-muted-foreground">{JOIN_HELPER}</p>
            </div>
            <Input
              type="email"
              required
              inputMode="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-12 min-h-12 rounded-[var(--radius-button)] bg-card text-base"
              aria-label="Email address"
            />
            <Button
              type="submit"
              size="fat"
              className="w-full"
              disabled={busy}
              aria-label={busy ? "Sending…" : "Email me a sign-in link"}
              aria-busy={busy}
            >
              {busy ? "Sending…" : "Email me a sign-in link"}
            </Button>
            <div>
              <p className="type-body text-muted-foreground">{LOGIN_SAME_DEVICE_COPY}</p>
              <p className="type-meta mt-1 text-muted-foreground">{LOGIN_SAME_DEVICE_HELPER}</p>
            </div>
          </form>
        )}
        {error ? (
          <p className="type-meta mt-3 text-destructive" role="alert">
            {error}
          </p>
        ) : null}
      </HouseCard>
      )}
    </AppShell>
  );
}
