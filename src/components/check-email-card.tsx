"use client";

import { Mail } from "lucide-react";
import { HouseCard } from "@/components/house-card";
import { Button } from "@/components/ui/button";
import {
  CHECK_EMAIL_DIFFERENT,
  CHECK_EMAIL_HELPER,
  CHECK_EMAIL_RESEND,
  CHECK_EMAIL_STATUS,
  CHECK_EMAIL_TITLE,
  checkEmailBody,
} from "@/lib/login";

export function CheckEmailCard({
  email,
  busy = false,
  onResend,
  onDifferentEmail,
}: {
  email: string;
  busy?: boolean;
  onResend: () => void;
  onDifferentEmail: () => void;
}) {
  return (
    <HouseCard data-slot="check-email">
      <div className="flex flex-col items-center text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-secondary text-primary">
          <Mail className="size-5" aria-hidden />
        </div>
        <p
          role="status"
          className="type-meta mt-3 inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-muted-foreground"
        >
          <span className="size-1.5 rounded-full bg-approve" aria-hidden />
          {CHECK_EMAIL_STATUS}
        </p>
        <h2 className="type-title mt-4 text-foreground">{CHECK_EMAIL_TITLE}</h2>
        <p className="type-body mt-2 text-muted-foreground">{checkEmailBody(email)}</p>
        <p className="type-meta mt-3 text-muted-foreground">{CHECK_EMAIL_HELPER}</p>
        <div className="mt-2 flex flex-col items-center">
          <Button
            type="button"
            variant="link"
            className="h-auto min-h-12 px-0 text-base"
            disabled={busy}
            aria-busy={busy}
            onClick={onResend}
          >
            {busy ? "Sending…" : CHECK_EMAIL_RESEND}
          </Button>
          <Button
            type="button"
            variant="link"
            className="h-auto min-h-12 px-0 text-base"
            disabled={busy}
            onClick={onDifferentEmail}
          >
            {CHECK_EMAIL_DIFFERENT}
          </Button>
        </div>
      </div>
    </HouseCard>
  );
}
