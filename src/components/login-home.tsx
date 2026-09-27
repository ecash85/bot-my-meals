"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BackendSetupGate } from "@/components/backend-setup-gate";
import { BrandMark } from "@/components/brand-mark";
import { CheckEmailCard } from "@/components/check-email-card";
import { useSupper } from "@/components/supper-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LOGIN_SAME_DEVICE_COPY, LOGIN_SAME_DEVICE_HELPER } from "@/lib/login";

export function LoginHome({
  callbackError = null,
}: {
  callbackError?: string | null;
}) {
  const { mode, signInMagicLink, session, ready } = useSupper();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(callbackError);

  const headingToWeek = ready && Boolean(session);

  useEffect(() => {
    if (headingToWeek) router.replace("/week");
  }, [headingToWeek, router]);

  if (mode === "setup") {
    return <BackendSetupGate />;
  }

  const showForm = ready && !session;

  const sendLink = async () => {
    setBusy("email");
    setError(null);
    try {
      await signInMagicLink(email.trim());
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send a link");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div
      data-slot="login-home"
      className="mx-auto flex min-h-dvh w-full max-w-lg flex-col bg-background px-6 pb-10 pt-[max(4.5rem,12vh,calc(env(safe-area-inset-top)+1rem))]"
      aria-busy={!ready}
    >
      <BrandMark size="hero" />

      {showForm ? (
        <div className="mt-10 animate-in fade-in duration-300 ease-out">
          {error ? (
            <p className="mb-4 text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          {sent ? (
            <CheckEmailCard
              email={email.trim()}
              busy={busy === "email"}
              onResend={() => void sendLink()}
              onDifferentEmail={() => {
                setSent(false);
                setError(null);
              }}
            />
          ) : (
            <form
              className="space-y-3 rounded-[14px] bg-card p-5 shadow-card"
              onSubmit={(event) => {
                event.preventDefault();
                void sendLink();
              }}
            >
              <p className="type-body text-muted-foreground">
                We email a sign-in link. No password. Nothing is sent unless you ask for a link.
              </p>
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
                disabled={busy !== null}
                aria-label={busy === "email" ? "Sending…" : "Email me a sign-in link"}
                aria-busy={busy === "email"}
              >
                {busy === "email" ? "Sending…" : "Email me a sign-in link"}
              </Button>
              <div>
                <p className="type-body text-muted-foreground">{LOGIN_SAME_DEVICE_COPY}</p>
                <p className="type-meta mt-1 text-muted-foreground">{LOGIN_SAME_DEVICE_HELPER}</p>
              </div>
            </form>
          )}
        </div>
      ) : null}
    </div>
  );
}
