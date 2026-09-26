import { APPEARANCE_KEY } from "./config";
import { THEME_BACKGROUND, THEME_DARK_BACKGROUND, THEME_PRIMARY } from "./theme";

export const THEME_PREFERENCES = ["device", "light", "dark"] as const;
export type ThemePreference = (typeof THEME_PREFERENCES)[number];
export type ResolvedTheme = "light" | "dark";

export const THEME_PREFERENCE_OPTIONS = [
  { value: "device", label: "Device" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
] as const;

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === "device" || value === "light" || value === "dark";
}

export function parseThemePreference(value: string | null | undefined): ThemePreference {
  return isThemePreference(value) ? value : "device";
}

export function resolveTheme(preference: ThemePreference, prefersDark: boolean): ResolvedTheme {
  switch (preference) {
    case "light":
      return "light";
    case "dark":
      return "dark";
    case "device":
      return prefersDark ? "dark" : "light";
    default: {
      const _never: never = preference;
      return _never;
    }
  }
}

export function canvasColor(resolved: ResolvedTheme): string {
  return resolved === "dark" ? THEME_DARK_BACKGROUND : THEME_BACKGROUND;
}

export function readThemePreference(): ThemePreference {
  if (typeof window === "undefined") return "device";
  try {
    return parseThemePreference(window.localStorage.getItem(APPEARANCE_KEY));
  } catch {
    return "device";
  }
}

export function writeThemePreference(preference: ThemePreference) {
  window.localStorage.setItem(APPEARANCE_KEY, preference);
}

export function prefersDarkScheme(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function applyResolvedTheme(resolved: ResolvedTheme) {
  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");
  root.style.colorScheme = resolved;
  root.style.backgroundColor = canvasColor(resolved);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", THEME_PRIMARY);
}

/** Runs before paint so Device/Light/Dark does not flash the opposite canvas. */
export const APPEARANCE_BOOTSTRAP_SCRIPT = `(function(){try{var k=${JSON.stringify(APPEARANCE_KEY)};var p=localStorage.getItem(k);var dark=p==="dark"||(p!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);var r=document.documentElement;r.classList.toggle("dark",dark);r.style.colorScheme=dark?"dark":"light";r.style.backgroundColor=dark?${JSON.stringify(THEME_DARK_BACKGROUND)}:${JSON.stringify(THEME_BACKGROUND)};}catch(e){}})();`;
