"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { BackendSetupGate } from "@/components/backend-setup-gate";
import { BrandMark } from "@/components/brand-mark";
import { useSupper } from "@/components/supper-provider";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { ready, session, mode } = useSupper();
  const router = useRouter();

  useEffect(() => {
    if (mode === "setup") return;
    if (ready && !session) router.replace("/login");
  }, [ready, session, router, mode]);

  if (mode === "setup") {
    return <BackendSetupGate />;
  }

  if (!ready || !session) {
    return (
      <div
        className="flex min-h-dvh items-center justify-center bg-background px-6 pt-[env(safe-area-inset-top)]"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <BrandMark align="center" size="hero" />
      </div>
    );
  }

  return <>{children}</>;
}
