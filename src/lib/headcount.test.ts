import { describe, expect, it } from "vitest";
import {
  audienceFromHeadcount,
  clampHeadcount,
  clampNightHeadcount,
  coupleNightsFromHeadcounts,
  headcountForNight,
  nightKindLabel,
  normalizeNightHeadcounts,
  servingsLabel,
  typicalSizesFromHeadcounts,
  typicalWeekHeadcounts,
  typicalWeekLabel,
} from "./headcount";

describe("night headcounts", () => {
  it("clamps typical sizes to 1–12 and nights to 0–12", () => {
    expect(clampHeadcount(0)).toBe(1);
    expect(clampHeadcount(13)).toBe(12);
    expect(clampHeadcount(3.6)).toBe(4);
    expect(clampNightHeadcount(0)).toBe(0);
    expect(clampNightHeadcount(-2)).toBe(0);
    expect(clampNightHeadcount(13)).toBe(12);
  });

  it("defaults to family 4 and Fri/Sat couple 2", () => {
    expect(normalizeNightHeadcounts(null)).toEqual([4, 4, 4, 4, 4, 2, 2]);
    expect(typicalWeekHeadcounts()).toEqual([4, 4, 4, 4, 4, 2, 2]);
  });

  it("keeps an off night at 0 instead of bumping it to 1", () => {
    expect(normalizeNightHeadcounts([0, 4, 4, 4, 4, 2, 1])).toEqual([0, 4, 4, 4, 4, 2, 1]);
  });

  it("rebuilds from the old couple-nights toggle", () => {
    expect(
      normalizeNightHeadcounts(undefined, {
        coupleNights: [5, 6],
        familySize: 4,
        coupleSize: 2,
      }),
    ).toEqual([4, 4, 4, 4, 4, 2, 2]);
  });

  it("treats 2 as couple and everything else as family", () => {
    expect(audienceFromHeadcount(2)).toBe("couple");
    expect(audienceFromHeadcount(4)).toBe("family");
    expect(audienceFromHeadcount(1)).toBe("family");
    expect(audienceFromHeadcount(0)).toBe("family");
  });

  it("labels 0 as off, 1 as solo, 2 as couple, and the rest as family", () => {
    expect(nightKindLabel(0)).toBe("Off night");
    expect(nightKindLabel(1)).toBe("Solo night");
    expect(nightKindLabel(2)).toBe("Couple night");
    expect(nightKindLabel(4)).toBe("Family night");
    expect(servingsLabel(0)).toBe("No dinner");
    expect(servingsLabel(1)).toBe("1 person");
  });

  it("saves typical week sizes from the nights above", () => {
    expect(typicalSizesFromHeadcounts([0, 5, 5, 5, 5, 3, 1])).toEqual({
      familySize: 5,
      coupleSize: 3,
    });
    expect(typicalWeekLabel(5, 3)).toBe("Apply typical week: weeknights 5, Fri/Sat 3");
  });

  it("maps a Wednesday=4 Friday=2 Saturday=2 week onto night dates", () => {
    const household = {
      nightHeadcounts: [4, 4, 4, 4, 4, 2, 2],
      coupleNights: [5, 6],
      familySize: 4,
      coupleSize: 2,
    };
    expect(headcountForNight(household, "2026-09-09")).toBe(4); // Wednesday
    expect(headcountForNight(household, "2026-09-11")).toBe(2); // Friday
    expect(headcountForNight(household, "2026-09-12")).toBe(2); // Saturday
    expect(coupleNightsFromHeadcounts(household.nightHeadcounts)).toEqual([5, 6]);
  });
});
