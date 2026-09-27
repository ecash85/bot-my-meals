"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { useSupper } from "@/components/supper-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CREATE_HOUSE_BODY,
  CREATE_HOUSE_DEFAULT_NAME,
  CREATE_HOUSE_HELPER,
  CREATE_HOUSE_TITLE,
} from "@/lib/setup";

export function Onboarding() {
  const { createHousehold, error: loadError } = useSupper();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const message = error ?? loadError;

  return (
    <AppShell title={CREATE_HOUSE_TITLE} hideNav>
      <div data-slot="create-household">
        <p className="type-body text-muted-foreground">{CREATE_HOUSE_BODY}</p>
        <form
          className="mt-8 space-y-3"
          onSubmit={async (event) => {
            event.preventDefault();
            setError(null);
            setBusy(true);
            try {
              await createHousehold(name.trim() || CREATE_HOUSE_DEFAULT_NAME);
            } catch (err) {
              setError(err instanceof Error ? err.message : "Could not create a household");
            } finally {
              setBusy(false);
            }
          }}
        >
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={CREATE_HOUSE_DEFAULT_NAME}
            className="h-12 min-h-12 rounded-[var(--radius-button)] bg-card text-base"
            aria-label="Household name"
            disabled={busy}
          />
          <Button
            type="submit"
            size="fat"
            className="w-full"
            disabled={busy}
            aria-label={busy ? "Creating household" : "Create household"}
            aria-busy={busy}
          >
            {busy ? <Loader2 className="size-5 animate-spin" aria-hidden /> : null}
            {busy ? "Creating…" : "Create household"}
          </Button>
        </form>
        <p className="type-meta mt-4 text-muted-foreground">{CREATE_HOUSE_HELPER}</p>
        {message ? (
          <p role="alert" className="mt-4 text-sm text-destructive">
            {message}
          </p>
        ) : null}
      </div>
    </AppShell>
  );
}
