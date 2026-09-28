import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { focusNightCard, nightCardAnchorId, weekStripCells } from "./week-strip";

const crossMonth = [
  { id: "sun", nightDate: "2026-09-27" },
  { id: "mon", nightDate: "2026-09-28" },
  { id: "tue", nightDate: "2026-09-29" },
  { id: "wed", nightDate: "2026-09-30" },
  { id: "thu", nightDate: "2026-10-01" },
  { id: "fri", nightDate: "2026-10-02" },
  { id: "sat", nightDate: "2026-10-03" },
];

describe("weekStripCells", () => {
  it("builds seven compact cells and shows the month when it flips", () => {
    const cells = weekStripCells(crossMonth);
    expect(cells).toHaveLength(7);
    expect(cells.map((cell) => cell.letter)).toEqual(["S", "M", "T", "W", "T", "F", "S"]);
    expect(cells.map((cell) => cell.day)).toEqual([27, 28, 29, 30, 1, 2, 3]);
    expect(cells.map((cell) => cell.month)).toEqual(["Sep", null, null, null, "Oct", null, null]);
  });

  it("shows the month only on the first cell when the week stays in one month", () => {
    const cells = weekStripCells([
      { id: "sun", nightDate: "2026-10-04" },
      { id: "mon", nightDate: "2026-10-05" },
      { id: "sat", nightDate: "2026-10-10" },
    ]);
    expect(cells.map((cell) => cell.month)).toEqual(["Oct", null, null]);
    expect(cells.map((cell) => cell.day)).toEqual([4, 5, 10]);
  });
});

describe("focusNightCard", () => {
  it("scrolls and focuses that night's card without leaving the list", () => {
    const scrollIntoView = vi.fn();
    const focus = vi.fn();
    const found = focusNightCard("thu", (id) => {
      expect(id).toBe(nightCardAnchorId("thu"));
      return { scrollIntoView, focus };
    });
    expect(found).toBe(true);
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
  });

  it("does nothing when the card is missing", () => {
    expect(focusNightCard("missing", () => null)).toBe(false);
  });
});

describe("This week strip", () => {
  it("sits under the header, jumps inside the list, and leaves card actions in place", () => {
    const root = path.resolve(import.meta.dirname, "..");
    const week = readFileSync(path.join(root, "app/week/page.tsx"), "utf8");
    const chrome = readFileSync(path.join(root, "components/week-chrome.tsx"), "utf8");
    const strip = readFileSync(path.join(root, "components/week-strip.tsx"), "utf8");
    const card = readFileSync(path.join(root, "components/ballot-card.tsx"), "utf8");

    expect(week).toContain("<WeekChrome");
    expect(week).toContain("focusNightCard");
    expect(week).toContain("nightCardAnchorId");
    expect(week).toContain("<BallotCard");
    expect(week).toContain("<EmptyDayCard");
    expect(week).toContain("<LockBar");
    expect(week).not.toContain("Calendar");
    expect(week).not.toContain("month-grid");
    expect(chrome).toContain("<WeekStrip");
    expect(chrome).toContain("top-[calc(var(--shell-head-h)-1px)]");
    expect(chrome).toContain("bg-background ");
    expect(chrome).not.toContain("bg-background/95");
    expect(chrome).not.toContain("backdrop-blur");
    expect(strip).toContain('data-slot="week-strip"');
    expect(strip).toContain("min-h-[44px]");
    expect(strip).toContain("min-w-[44px]");
    expect(strip).toContain("gap-2");
    expect(strip).toContain("py-3");
    expect(strip).toContain("flex-1");
    expect(strip).toContain('type="button"');
    expect(strip).not.toContain("<Lock");
    expect(strip).not.toContain("lucide-react");
    expect(strip).not.toContain("href=");
    expect(strip).not.toContain("Calendar");
    expect(card).toMatch(/>\s*Swap\s*</);
    expect(card).toMatch(/>\s*Remove\s*</);
  });
});
