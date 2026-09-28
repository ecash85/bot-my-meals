"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { PasswordField } from "@/components/password-field";
import { useSupper } from "@/components/supper-provider";
import { Button } from "@/components/ui/button";
import { useSignInOrigin } from "@/components/use-sign-in-origin";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  NEW_PASSWORD_BUSY,
  NEW_PASSWORD_CTA,
  NEW_PASSWORD_HELPER,
  NEW_PASSWORD_MISSING,
  NEW_PASSWORD_SAVED_BODY,
  NEW_PASSWORD_SAVED_TITLE,
  NEW_PASSWORD_TITLE,
  PASSWORD_HINT,
  RESET_BACK,
  clientPasswordBlock,
  passwordAuthFailureMessage,
  recoverySessionFromHash,
  signInOriginLine,
} from "@/lib/login";

type Phase = "checking" | "ready" | "missing" | "saved";

export function NewPasswordForm() {
  const { updatePassword } = useSupper();
  const [phase, setPhase] = useState<Phase>("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);
  const origin = useSignInOrigin();

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const client = createSupabaseBrowserClient();
      if (!client) {
        if (!cancelled) setPhase("missing");
        return;
      }
      try {
        const tokens = recoverySessionFromHash(window.location.hash);
        if (tokens) {
          const { error: sessionError } = await client.auth.setSession(tokens);
          if (sessionError) throw sessionError;
          window.history.replaceState(null, "", window.location.pathname);
        } else {
          const code = new URLSearchParams(window.location.search).get("code");
          if (code) {
            const { error: exchangeError } = await client.auth.exchangeCodeForSession(code);
            if (exchangeError) throw exchangeError;
            window.history.replaceState(null, "", window.location.pathname);
          } else {
            const { data } = await client.auth.getSession();
            if (!data.session) {
              if (!cancelled) setPhase("missing");
              return;
            }
          }
        }
        if (!cancelled) setPhase("ready");
      } catch {
        if (!cancelled) setPhase("missing");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const save = async () => {
    if (inFlight.current) return;
    const blocked = clientPasswordBlock(password, confirm);
    if (blocked) {
      setError(blocked);
      return;
    }
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      setError(passwordAuthFailureMessage("update", null, false));
      return;
    }
    inFlight.current = true;
    setBusy(true);
    setError(null);
    try {
      await updatePassword(password);
      setPhase("saved");
    } catch (err) {
      setError(passwordAuthFailureMessage("update", err, navigator.onLine));
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  if (phase === "checking") {
    return (
      <p className="type-body text-muted-foreground" role="status" data-slot="new-password">
        Opening reset…
      </p>
    );
  }

  if (phase === "missing") {
    return (
      <div data-slot="new-password" className="space-y-3">
        <h1 className="type-title text-foreground">{NEW_PASSWORD_TITLE}</h1>
        <p className="type-body text-muted-foreground" role="alert">
          {NEW_PASSWORD_MISSING}
        </p>
        <Button variant="ghost" className="h-auto min-h-12 w-full text-base" asChild>
          <Link href="/login">{RESET_BACK}</Link>
        </Button>
      </div>
    );
  }

  if (phase === "saved") {
    return (
      <div data-slot="new-password" className="space-y-3">
        <h1 className="type-title text-foreground">{NEW_PASSWORD_SAVED_TITLE}</h1>
        <p className="type-body text-muted-foreground">{NEW_PASSWORD_SAVED_BODY}</p>
        <Button variant="ghost" className="h-auto min-h-12 w-full text-base" asChild>
          <Link href="/login">{RESET_BACK}</Link>
        </Button>
      </div>
    );
  }

  return (
    <form
      data-slot="new-password"
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
    >
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <h1 className="type-title text-foreground">{NEW_PASSWORD_TITLE}</h1>
      <p className="type-body text-muted-foreground">{NEW_PASSWORD_HELPER}</p>
      {origin ? <p className="type-meta text-muted-foreground">{signInOriginLine(origin)}</p> : null}
      <PasswordField
        value={password}
        onChange={(value) => {
          setPassword(value);
          setError(null);
        }}
        autoComplete="new-password"
        ariaLabel="Password"
        disabled={busy}
        invalid={Boolean(error)}
      />
      <PasswordField
        value={confirm}
        onChange={(value) => {
          setConfirm(value);
          setError(null);
        }}
        autoComplete="new-password"
        ariaLabel="Confirm password"
        disabled={busy}
        invalid={Boolean(error)}
      />
      <p className="type-meta text-muted-foreground">{PASSWORD_HINT}</p>
      <Button
        type="submit"
        size="fat"
        variant="primary"
        className="w-full"
        disabled={busy}
        aria-busy={busy}
      >
        {busy ? <Loader2 className="size-5 animate-spin" aria-hidden /> : null}
        {busy ? NEW_PASSWORD_BUSY : NEW_PASSWORD_CTA}
      </Button>
    </form>
  );
}
