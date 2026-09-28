"use client";

import { useState } from "react";
import { HouseCard } from "@/components/house-card";
import { markBotWakeConfigured, useBotWakeConfigured } from "@/components/use-bot-wake";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  BOT_WAKE_EMPTY,
  BOT_WAKE_KEY_HELPER,
  BOT_WAKE_KEY_LABEL,
  BOT_WAKE_KEY_PLACEHOLDER,
  BOT_WAKE_REPLACE,
  BOT_WAKE_SAVED,
  BOT_WAKE_SECTION_LABEL,
  BOT_WAKE_URL_HELPER,
  BOT_WAKE_URL_LABEL,
  BOT_WAKE_URL_PLACEHOLDER,
} from "@/lib/bot-wake";
import { saveBotWakeSettings } from "@/lib/bot-wake-client";

export function BotWakeSettings({
  canEdit,
  configured: configuredOverride,
}: {
  canEdit: boolean;
  configured?: boolean;
}) {
  const fetched = useBotWakeConfigured(configuredOverride);
  const [justSaved, setJustSaved] = useState(false);
  const [replacing, setReplacing] = useState(false);
  const [url, setUrl] = useState("");
  const [key, setKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const showSaved = fetched || justSaved;
  const showForm = canEdit && (!showSaved || replacing);

  return (
    <HouseCard id="wake-your-bot" className="mt-6 scroll-mt-24" data-slot="bot-wake-settings">
      <h2 className="type-section text-primary">{BOT_WAKE_SECTION_LABEL}</h2>
      {canEdit ? <p className="type-meta mt-1 text-muted-foreground">{BOT_WAKE_URL_HELPER}</p> : null}
      {showSaved ? (
        <div className="mt-3 space-y-3">
          <p data-slot="bot-wake-saved" className="type-meta text-foreground">
            {BOT_WAKE_SAVED}
          </p>
          {canEdit && !replacing ? (
            <Button
              type="button"
              variant="outline"
              size="fat"
              className="w-full"
              data-slot="bot-wake-replace"
              onClick={() => {
                setUrl("");
                setKey("");
                setError(null);
                setReplacing(true);
              }}
            >
              {BOT_WAKE_REPLACE}
            </Button>
          ) : null}
        </div>
      ) : (
        <p data-slot="bot-wake-empty" className="type-meta mt-3 text-muted-foreground">
          {BOT_WAKE_EMPTY}
        </p>
      )}
      {showForm ? (
        <form
          className="mt-3 space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            setError(null);
            setBusy(true);
            void saveBotWakeSettings({ url, key })
              .then((result) => {
                if (!result.ok) {
                  setError(result.message);
                  return;
                }
                setUrl("");
                setKey("");
                setReplacing(false);
                setJustSaved(true);
                markBotWakeConfigured();
              })
              .finally(() => setBusy(false));
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="bot-wake-url">{BOT_WAKE_URL_LABEL}</Label>
            <Input
              id="bot-wake-url"
              name="bot-wake-url"
              type="url"
              inputMode="url"
              autoComplete="off"
              spellCheck={false}
              placeholder={BOT_WAKE_URL_PLACEHOLDER}
              value={url}
              onChange={(event) => setUrl(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bot-wake-key">{BOT_WAKE_KEY_LABEL}</Label>
            <p className="type-meta text-muted-foreground">{BOT_WAKE_KEY_HELPER}</p>
            <Input
              id="bot-wake-key"
              name="bot-wake-key"
              type="password"
              autoComplete="off"
              spellCheck={false}
              placeholder={BOT_WAKE_KEY_PLACEHOLDER}
              value={key}
              onChange={(event) => setKey(event.target.value)}
            />
          </div>
          <Button size="fat" className="w-full" disabled={busy} aria-busy={busy}>
            {busy ? "Saving…" : "Save webhook"}
          </Button>
          {error ? <p className="type-meta text-destructive">{error}</p> : null}
        </form>
      ) : null}
    </HouseCard>
  );
}
