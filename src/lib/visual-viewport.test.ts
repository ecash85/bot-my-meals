import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { visualViewportBottomInset, visualViewportSheetMaxHeight } from "./visual-viewport";

const srcRoot = path.resolve(import.meta.dirname, "..");

describe("visualViewportBottomInset", () => {
  it("is max(0, innerHeight - vv.height - vv.offsetTop)", () => {
    expect(visualViewportBottomInset(844, 844, 0)).toBe(0);
    expect(visualViewportBottomInset(844, 508, 0)).toBe(336);
    expect(visualViewportBottomInset(844, 508, 24)).toBe(312);
    expect(visualViewportBottomInset(844, 900, 0)).toBe(0);
  });

  it("caps sheet height to min(90dvh, vv.height-12)", () => {
    expect(visualViewportSheetMaxHeight(0)).toBe("90dvh");
    expect(visualViewportSheetMaxHeight(844)).toBe("min(90dvh, 832px)");
    expect(visualViewportSheetMaxHeight(508)).toBe("min(90dvh, 496px)");
  });
});

describe("keyboard-safe bottom sheet", () => {
  it("uses the shared visualViewport hook on SheetContent, not a Swap-only hack", () => {
    const hook = readFileSync(path.join(srcRoot, "lib/visual-viewport.ts"), "utf8");
    const sheet = readFileSync(path.join(srcRoot, "components/ui/sheet.tsx"), "utf8");
    const swap = readFileSync(path.join(srcRoot, "components/ballot-card.tsx"), "utf8");
    const add = readFileSync(path.join(srcRoot, "components/empty-day-card.tsx"), "utf8");
    const layout = readFileSync(path.join(srcRoot, "app/layout.tsx"), "utf8");

    expect(hook).toContain("export function useVisualViewportBottomInset");
    expect(hook).toContain("visualViewportBottomInset(window.innerHeight, vv.height, vv.offsetTop)");
    expect(hook).toContain('vv.addEventListener("resize"');
    expect(hook).toContain('vv.addEventListener("scroll"');
    expect(hook).toContain("useState<VisualViewportMetrics>(SSR_METRICS)");
    expect(hook).toContain("inset: 0");

    expect(sheet).toContain("useVisualViewportBottomInset");
    expect(sheet).toContain("bottom: inset");
    expect(sheet).toContain("visualViewportSheetMaxHeight");
    expect(sheet).toContain('data-slot="sheet-body"');
    expect(sheet).toContain("overflow-y-auto");
    expect(sheet).toContain("shrink-0");
    expect(sheet).toContain("pb-[max(1rem,env(safe-area-inset-bottom))]");
    expect(sheet).toContain("flex flex-col");

    expect(swap).toContain('from "@/components/ui/sheet"');
    expect(add).toContain('from "@/components/ui/sheet"');
    expect(swap).toContain('side="bottom"');
    expect(add).toContain('side="bottom"');
    expect(swap).not.toContain("visualViewport");
    expect(add).not.toContain("visualViewport");
    expect(swap).not.toContain("interactiveWidget");
    expect(add).not.toContain("interactiveWidget");
    expect(layout).not.toContain("interactiveWidget");
  });
});
