"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useSupper } from "@/components/supper-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  LOGIN_HELPER,
  LOGIN_INTRO,
  OTP_DIFFERENT,
  OTP_RESEND,
  OTP_RESEND_COOLDOWN_MS,
  OTP_SEND,
  OTP_SENDING,
  OTP_TITLE,
  OTP_VERIFY,
  OTP_VERIFYING,
  otpCodeFromInput,
  otpFailureMessage,
  otpOriginLine,
} from "@/lib/login";

function subscribeSignInOrigin(): () => void {
  return () => {};
}

function signInOriginSnapshot(): string {
  return window.location.origin;
}

function signInOriginServerSnapshot(): string {
  return "";
}

function useSignInOrigin(): string {
  return useSyncExternalStore(subscribeSignInOrigin, signInOriginSnapshot, signInOriginServerSnapshot);
}

export function EmailOtpForm({
  next,
  callbackError = null,
  showIntro = true,
}: {
  next?: string;
  callbackError?: string | null;
  showIntro?: boolean;
}) {
  const { sendEmailOtp, verifyEmailOtp } = useSupper();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [busy, setBusy] = useState<"send" | "verify" | null>(null);
  const [error, setError] = useState<string | null>(callbackError);
  const [resendAt, setResendAt] = useState(0);
  const [now, setNow] = useState(0);
  const inFlight = useRef(false);
  const lastAutoCode = useRef("");
  const origin = useSignInOrigin();

  useEffect(() => {
    if (resendAt === 0) return;
    const timer = window.setInterval(() => {
      const tick = Date.now();
      setNow(tick);
      if (tick >= resendAt) window.clearInterval(timer);
    }, 500);
    return () => window.clearInterval(timer);
  }, [resendAt]);

  const resendLocked = resendAt > now;
  const trimmedEmail = email.trim();

  const send = async () => {
    if (inFlight.current) return;
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      setError(otpFailureMessage("send", null, false));
      return;
    }
    inFlight.current = true;
    setBusy("send");
    setError(null);
    try {
      await sendEmailOtp(trimmedEmail, next ? { next } : undefined);
      setStep("code");
      setCode("");
      lastAutoCode.current = "";
      const sentAt = Date.now();
      setNow(sentAt);
      setResendAt(sentAt + OTP_RESEND_COOLDOWN_MS);
    } catch (err) {
      setError(otpFailureMessage("send", err, navigator.onLine));
    } finally {
      inFlight.current = false;
      setBusy(null);
    }
  };

  const verify = async (token: string) => {
    if (inFlight.current || token.length !== 6) return;
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      setError(otpFailureMessage("verify", null, false));
      return;
    }
    inFlight.current = true;
    setBusy("verify");
    setError(null);
    try {
      await verifyEmailOtp(trimmedEmail, token);
    } catch (err) {
      setError(otpFailureMessage("verify", err, navigator.onLine));
    } finally {
      inFlight.current = false;
      setBusy(null);
    }
  };

  useEffect(() => {
    if (step !== "code" || code.length !== 6 || busy) return;
    if (lastAutoCode.current === code) return;
    lastAutoCode.current = code;
    void verify(code);
    // verify is recreated each render; the code + busy guards prevent a loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, step, busy]);

  const resend = async () => {
    if (resendLocked) {
      setError(otpFailureMessage("send", { status: 429, message: "rate limit" }));
      return;
    }
    await send();
  };

  return (
    <form
      data-slot="email-otp"
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (step === "email") void send();
        else void verify(code);
      }}
    >
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {step === "email" ? (
        <>
          {showIntro ? <p className="type-body text-muted-foreground">{LOGIN_INTRO}</p> : null}
          <Input
            type="email"
            required
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
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
            aria-label={busy === "send" ? OTP_SENDING : OTP_SEND}
            aria-busy={busy === "send"}
          >
            {busy === "send" ? OTP_SENDING : OTP_SEND}
          </Button>
          <p className="type-body text-muted-foreground">{LOGIN_HELPER}</p>
        </>
      ) : (
        <>
          <h2 className="type-title text-foreground">{OTP_TITLE}</h2>
          <p className="type-body text-muted-foreground">
            We sent a code to <strong className="font-semibold text-foreground">{trimmedEmail}</strong>.
          </p>
          {origin ? <p className="type-meta text-muted-foreground">{otpOriginLine(origin)}</p> : null}
          <Input
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            pattern="[0-9]*"
            value={code}
            onChange={(event) => {
              const nextCode = otpCodeFromInput(event.target.value);
              if (nextCode.length < 6) lastAutoCode.current = "";
              setCode(nextCode);
            }}
            className="h-14 min-h-12 rounded-[var(--radius-button)] bg-card text-center text-2xl tracking-[0.3em]"
            aria-label="6-digit code"
            aria-invalid={error ? true : undefined}
          />
          <Button
            type="submit"
            size="fat"
            className="w-full"
            disabled={busy !== null || code.length !== 6}
            aria-label={busy === "verify" ? OTP_VERIFYING : OTP_VERIFY}
            aria-busy={busy === "verify"}
          >
            {busy === "verify" ? OTP_VERIFYING : OTP_VERIFY}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="h-auto min-h-12 w-full text-base"
            disabled={busy !== null || resendLocked}
            aria-busy={busy === "send"}
            onClick={() => void resend()}
          >
            {busy === "send" ? OTP_SENDING : OTP_RESEND}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="h-auto min-h-12 w-full text-base"
            disabled={busy !== null}
            onClick={() => {
              setStep("email");
              setCode("");
              setError(null);
              lastAutoCode.current = "";
              setResendAt(0);
            }}
          >
            {OTP_DIFFERENT}
          </Button>
        </>
      )}
    </form>
  );
}
