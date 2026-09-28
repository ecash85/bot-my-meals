"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { BackendSetupGate } from "@/components/backend-setup-gate";
import { BrandMark } from "@/components/brand-mark";
import { EmailOtpForm } from "@/components/email-otp-form";
import { useSupper } from "@/components/supper-provider";

export function LoginHome({
  callbackError = null,
}: {
  callbackError?: string | null;
}) {
  const { mode, session, ready } = useSupper();
  const router = useRouter();

  const headingToWeek = ready && Boolean(session);

  useEffect(() => {
    if (headingToWeek) router.replace("/week");
  }, [headingToWeek, router]);

  if (mode === "setup") {
    return <BackendSetupGate />;
  }

  const showForm = ready && !session;

  return (
    <div
      data-slot="login-home"
      className="mx-auto flex min-h-dvh w-full max-w-lg flex-col bg-background px-6 pb-10 pt-[max(4.5rem,12vh,calc(env(safe-area-inset-top)+1rem))]"
      aria-busy={!ready}
    >
      <BrandMark size="hero" />

      {showForm ? (
        <div className="mt-10 animate-in fade-in duration-300 ease-out">
          <div className="rounded-[14px] bg-card p-5 shadow-card">
            <EmailOtpForm callbackError={callbackError} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
