import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { formatMealCardDayLabel, mealCardControlId } from "./dates";

describe("formatMealCardDayLabel", () => {
  it("uses short title-case weekday, a middot, and month plus day", () => {
    expect(formatMealCardDayLabel("2026-09-27")).toBe("Sun · Sep 27");
    expect(formatMealCardDayLabel("2026-09-28")).toBe("Mon · Sep 28");
    expect(formatMealCardDayLabel("2026-09-29")).toBe("Tue · Sep 29");
    expect(formatMealCardDayLabel("2026-09-30")).toBe("Wed · Sep 30");
    expect(formatMealCardDayLabel("2026-10-01")).toBe("Thu · Oct 1");
    expect(formatMealCardDayLabel("2026-10-02")).toBe("Fri · Oct 2");
    expect(formatMealCardDayLabel("2026-10-03")).toBe("Sat · Oct 3");
  });

  it("keeps the month on the card when a week crosses months", () => {
    const labels = ["2026-09-27", "2026-10-03"].map((iso) => formatMealCardDayLabel(iso));
    expect(labels[0]).toContain("Sep");
    expect(labels[1]).toContain("Oct");
    expect(labels.join(" ")).not.toMatch(/\b(SUN|MON|TUE|WED|THU|FRI|SAT)\b/);
  });
});

describe("mealCardControlId", () => {
  it("slugs the visible day label into a field id", () => {
    expect(mealCardControlId("swap-reason", "Sun · Sep 27")).toBe("swap-reason-sun-sep-27");
    expect(mealCardControlId("add-note", "Thu · Oct 1")).toBe("add-note-thu-oct-1");
  });
});

describe("This week meal card day labels", () => {
  it("prints the formatted label on every card and leaves Swap, Remove, and Lock in place", () => {
    const root = path.resolve(import.meta.dirname, "..");
    const week = readFileSync(path.join(root, "app/week/page.tsx"), "utf8");
    const card = readFileSync(path.join(root, "components/ballot-card.tsx"), "utf8");
    const empty = readFileSync(path.join(root, "components/empty-day-card.tsx"), "utf8");
    const css = readFileSync(path.join(root, "app/globals.css"), "utf8");

    expect(week).toContain("formatMealCardDayLabel(meal.nightDate)");
    expect(week).not.toContain("weekdayShortFromNight");
    expect(week.match(/dayLabel=\{dayLabel\}/g)).toHaveLength(4);
    expect(card).toContain('data-slot="meal-day-label"');
    expect(card).toContain("type-day-label");
    expect(card).not.toContain("type-eyebrow");
    expect(empty).toContain('data-slot="meal-day-label"');
    expect(empty).toContain("type-day-label");
    expect(css).toMatch(/@utility type-day-label[\s\S]*?text-transform:\s*none/);
    expect(card).toMatch(/>\s*Swap\s*</);
    expect(card).toMatch(/>\s*Remove\s*</);
    expect(week).toContain("<LockBar");
    expect(week).toContain("LockBar");
  });
});
