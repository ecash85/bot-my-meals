"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  INSTALL_DISMISSED_KEY,
  INSTALL_IOS_COPY,
  INSTALL_PROMPT_COPY,
  isStandaloneDisplay,
  shouldHintIosInstall,
} from "@/lib/install";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallPrompt() {
  const [show, setShow] = useState(false);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const dismissed = Boolean(window.sessionStorage.getItem(INSTALL_DISMISSED_KEY));
    const standalone = isStandaloneDisplay(
      (query) => window.matchMedia(query),
      "standalone" in navigator ? Boolean((navigator as Navigator & { standalone?: boolean }).standalone) : false,
    );
    if (standalone || dismissed) return;

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);

    const timer = window.setTimeout(() => {
      if (
        shouldHintIosInstall({
          standalone,
          dismissed,
          userAgent: navigator.userAgent,
        })
      ) {
        setShow(true);
      }
    }, 0);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", onPrompt);
    };
  }, []);

  if (!show) return null;

  const dismiss = () => {
    window.sessionStorage.setItem(INSTALL_DISMISSED_KEY, "1");
    setShow(false);
    setDeferred(null);
  };

  return (
    <div
      data-slot="install-banner"
      className="mb-4 rounded-[14px] bg-card p-4 shadow-card ring-1 ring-primary/20"
    >
      <p className="type-body">
        {deferred ? INSTALL_PROMPT_COPY : INSTALL_IOS_COPY}
      </p>
      <div className="mt-3 flex gap-2">
        {deferred ? (
          <Button
            type="button"
            size="fat"
            className="flex-1"
            onClick={async () => {
              await deferred.prompt();
              dismiss();
            }}
          >
            Install
          </Button>
        ) : null}
        <Button
          type="button"
          variant={deferred ? "outline" : "secondary"}
          size="fat"
          className="flex-1"
          onClick={dismiss}
        >
          Got it
        </Button>
      </div>
    </div>
  );
}
