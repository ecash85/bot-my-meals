"use client";

import { BackendSetupGate } from "@/components/backend-setup-gate";
import { BrandMark } from "@/components/brand-mark";
import { NewPasswordForm } from "@/components/new-password-form";
import { useSupper } from "@/components/supper-provider";

export function NewPasswordHome() {
  const { mode, ready } = useSupper();

  if (mode === "setup") {
    return <BackendSetupGate />;
  }

  return (
    <div
      data-slot="new-password-home"
      className="mx-auto flex min-h-dvh w-full max-w-lg flex-col bg-background px-6 pb-10 pt-[max(4.5rem,12vh,calc(env(safe-area-inset-top)+1rem))]"
      aria-busy={!ready}
    >
      <BrandMark size="hero" />
      {ready ? (
        <div className="mt-10 animate-in fade-in duration-300 ease-out">
          <div className="rounded-[14px] bg-card p-5 shadow-card">
            <NewPasswordForm />
          </div>
        </div>
      ) : null}
    </div>
  );
}
