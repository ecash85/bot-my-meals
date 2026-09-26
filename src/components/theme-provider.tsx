"use client";

import { createContext, useContext, useLayoutEffect, useMemo, useState } from "react";
import { APPEARANCE_KEY } from "@/lib/config";
import {
  applyResolvedTheme,
  prefersDarkScheme,
  readThemePreference,
  resolveTheme,
  writeThemePreference,
  type ResolvedTheme,
  type ThemePreference,
} from "@/lib/appearance";

type ThemeContextValue = {
  preference: ThemePreference;
  resolved: ResolvedTheme;
  setPreference: (preference: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useTheme must be used inside ThemeProvider");
  return value;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(() => readThemePreference());
  const [resolved, setResolved] = useState<ResolvedTheme>(() =>
    typeof window === "undefined"
      ? "light"
      : resolveTheme(readThemePreference(), prefersDarkScheme()),
  );

  useLayoutEffect(() => {
    const syncFromPreference = (nextPreference: ThemePreference) => {
      const nextResolved = resolveTheme(nextPreference, prefersDarkScheme());
      applyResolvedTheme(nextResolved);
      setPreferenceState(nextPreference);
      setResolved(nextResolved);
    };

    syncFromPreference(readThemePreference());

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onSchemeChange = () => {
      const current = readThemePreference();
      if (current === "device") syncFromPreference(current);
    };
    media.addEventListener("change", onSchemeChange);

    const onStorage = (event: StorageEvent) => {
      if (event.key === APPEARANCE_KEY) {
        syncFromPreference(readThemePreference());
      }
    };
    window.addEventListener("storage", onStorage);

    return () => {
      media.removeEventListener("change", onSchemeChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      preference,
      resolved,
      setPreference: (nextPreference) => {
        writeThemePreference(nextPreference);
        const nextResolved = resolveTheme(nextPreference, prefersDarkScheme());
        applyResolvedTheme(nextResolved);
        setPreferenceState(nextPreference);
        setResolved(nextResolved);
      },
    }),
    [preference, resolved],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
