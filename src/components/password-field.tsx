"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { HIDE_PASSWORD, SHOW_PASSWORD } from "@/lib/login";

export function PasswordField({
  value,
  onChange,
  autoComplete,
  ariaLabel,
  disabled,
  invalid,
}: {
  value: string;
  onChange: (value: string) => void;
  autoComplete: "new-password" | "current-password";
  ariaLabel: string;
  disabled?: boolean;
  invalid?: boolean;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative" data-slot="password-field">
      <Input
        type={visible ? "text" : "password"}
        autoComplete={autoComplete}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 min-h-12 rounded-[var(--radius-button)] bg-card pr-20 text-base"
        aria-label={ariaLabel}
        aria-invalid={invalid ? true : undefined}
      />
      <button
        type="button"
        className="absolute inset-y-0 right-0 flex min-w-12 items-center px-3 text-sm font-semibold text-primary"
        aria-label={visible ? HIDE_PASSWORD : SHOW_PASSWORD}
        disabled={disabled}
        onClick={() => setVisible((current) => !current)}
      >
        {visible ? "Hide" : "Show"}
      </button>
    </div>
  );
}
