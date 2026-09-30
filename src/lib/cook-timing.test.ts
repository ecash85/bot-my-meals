import { createElement } from "react";
import { readFileSync } from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AheadPrepNotice } from "@/components/ahead-prep";
import { BallotCard } from "@/components/ballot-card";
import { RecipeBlock } from "@/components/recipe-view";
import { PastWeekDetail } from "@/components/past-weeks";
import {
  DEFAULT_DINNER_TIME,
  collectPrepNotices,
  fridgeThawMinutes,
  mealCookPlan,
  parseAheadStepsColumn,
  resolveDinnerTime,
  resolvedDurations,
} from "./cook-timing";
import type { Recipe, Vote } from "./types";

const ZONE = "America/New_York";
const SATURDAY = "2026-10-03";
const FRIDAY = "2026-10-02";
const THURSDAY = "2026-10-01";
const WEDNESDAY = "2026-09-30";
const TUESDAY = "2026-09-29";
const MONDAY = "2026-09-28";
const SUNDAY = "2026-10-04";

function meal(partial: { id?: string; title?: string; nightDate?: string; prepMinutes?: number } = {}) {
  return {
    id: partial.id ?? "shoulder",
    title: partial.title ?? "Pork shoulder",
    nightDate: partial.nightDate ?? SATURDAY,
    prepMinutes: partial.prepMinutes ?? 0,
  };
}

function recipe(partial: Partial<Recipe> = {}): Recipe {
  return {
    id: "recipe",
    mealId: "shoulder",
    servings: 8,
    prepMinutes: 0,
    cookMinutes: 620,
    restMinutes: null,
    aheadSteps: [{ label: "inject + rub", leadMinutes: 22 * 60 }],
    steps: ["Smoke until the shoulder hits 203°F."],
    ingredients: [],
    ...partial,
  };
}

describe("mealCookPlan", () => {
  it("works a 620 minute smoke back to 7:40 AM and warns the night before", () => {
    const plan = mealCookPlan({
      meal: meal(),
      recipe: recipe(),
      timeZone: ZONE,
      dinnerTime: DEFAULT_DINNER_TIME,
    });

    expect(plan.durationLabel).toBe("10 hr 20 min");
    expect(plan.startByLabel).toBe("Start by 7:40 AM");
    expect(plan.aheadLine).toBe("Prep ahead: inject + rub");
    expect(plan.notices).toEqual([
      {
        mealId: "shoulder",
        showOn: FRIDAY,
        text: "Tonight: prep for tomorrow's pork shoulder, inject + rub, start smoker by 7:40 AM",
      },
    ]);
  });

  it("keeps a short cook on the dinner day", () => {
    const plan = mealCookPlan({
      meal: meal({ title: "Tacos", prepMinutes: 30 }),
      recipe: null,
      timeZone: ZONE,
    });
    expect(plan.durationLabel).toBe("30 min");
    expect(plan.startByLabel).toBe("Start by 5:30 PM");
    expect(plan.notices).toEqual([]);
  });

  it("treats 9:00 AM as the same day and 8:59 AM as the night before", () => {
    const onTime = mealCookPlan({
      meal: meal({ title: "Roast chicken" }),
      recipe: recipe({ cookMinutes: 9 * 60, aheadSteps: [], steps: ["Roast until the thigh hits 165°F."] }),
      timeZone: ZONE,
    });
    expect(onTime.startByLabel).toBe("Start by 9:00 AM");
    expect(onTime.notices).toEqual([]);

    const early = mealCookPlan({
      meal: meal({ title: "Roast chicken" }),
      recipe: recipe({ cookMinutes: 9 * 60 + 1, aheadSteps: [], steps: ["Roast until the thigh hits 165°F."] }),
      timeZone: ZONE,
    });
    expect(early.startByLabel).toBe("Start by 8:59 AM");
    expect(early.notices[0]?.showOn).toBe(FRIDAY);
    expect(early.notices[0]?.text).toBe("Tonight: start tomorrow's roast chicken by 8:59 AM");
  });

  it("calls out a smoke that has to start the previous evening", () => {
    const plan = mealCookPlan({
      meal: meal({ title: "Brisket" }),
      recipe: recipe({ cookMinutes: 22 * 60, aheadSteps: [] }),
      timeZone: ZONE,
    });
    expect(plan.startByLabel).toBe("Start by Friday 8:00 PM");
    expect(plan.notices[0]).toMatchObject({
      showOn: FRIDAY,
      text: "Tonight: start smoker for tomorrow's brisket by 8:00 PM",
    });
  });

  it("reads rest and overnight steps from text when the columns were never set", () => {
    const plan = mealCookPlan({
      meal: meal({ title: "Pork shoulder" }),
      recipe: recipe({
        prepMinutes: 20,
        cookMinutes: 0,
        restMinutes: null,
        aheadSteps: null,
        steps: [
          "The night before, inject and rub.",
          "Smoke for 10 hours.",
          "Rest the shoulder 60 minutes.",
        ],
      }),
      timeZone: ZONE,
    });
    expect(plan.cookMinutes).toBe(600);
    expect(plan.restMinutes).toBe(60);
    expect(plan.durationLabel).toBe("11 hr 20 min");
    expect(plan.breakdown).toBe("Prep 20 min · Cook 10 hr · Rest 1 hr");
    expect(plan.aheadLine).toBe("Prep ahead: inject + rub");
    expect(plan.notices[0]?.text).toContain("inject + rub");
  });

  it("does not invent a cook time when prep already holds the long number", () => {
    const plan = mealCookPlan({
      meal: meal(),
      recipe: recipe({
        prepMinutes: 620,
        cookMinutes: 0,
        aheadSteps: [],
        steps: ["Smoke for 10 hours."],
      }),
      timeZone: ZONE,
    });
    expect(plan.cookMinutes).toBe(0);
    expect(plan.totalMinutes).toBe(620);
    expect(plan.durationLabel).toBe("10 hr 20 min");
  });

  it("keeps an explicit zero rest and an empty ahead list", () => {
    const plan = mealCookPlan({
      meal: meal({ title: "Roast chicken" }),
      recipe: recipe({
        prepMinutes: 15,
        cookMinutes: 65,
        restMinutes: 0,
        aheadSteps: [],
        steps: ["Rest the chicken 10 minutes.", "Rub with olive oil."],
      }),
      timeZone: ZONE,
    });
    expect(plan.restMinutes).toBe(0);
    expect(plan.aheadLine).toBeNull();
    expect(plan.notices).toEqual([]);
    expect(plan.durationLabel).toBe("1 hr 20 min");
  });

  it("shows nothing extra when there is no time at all", () => {
    const plan = mealCookPlan({
      meal: meal({ title: "Salad", prepMinutes: 0 }),
      recipe: recipe({
        prepMinutes: 0,
        cookMinutes: 0,
        restMinutes: null,
        aheadSteps: null,
        steps: ["Toss and serve."],
      }),
      timeZone: ZONE,
    });
    expect(plan.durationLabel).toBeNull();
    expect(plan.startByLabel).toBeNull();
    expect(plan.notices).toEqual([]);
  });

  it("pulls a freezer ribeye on Thursday for Friday dinner", () => {
    const plan = mealCookPlan({
      meal: meal({ id: "ribeye", title: "Freezer ribeye", nightDate: FRIDAY }),
      recipe: recipe({
        mealId: "ribeye",
        prepMinutes: 15,
        cookMinutes: 20,
        restMinutes: 5,
        aheadSteps: null,
        steps: ["Thaw in the fridge.", "Sear the steak."],
      }),
      timeZone: ZONE,
    });

    expect(fridgeThawMinutes("Freezer ribeye", [])).toBe(36 * 60);
    expect(plan.notices).toEqual([
      {
        mealId: "ribeye",
        showOn: THURSDAY,
        text: "Pull ribeye from freezer to thaw in fridge for Fri dinner",
      },
    ]);
    expect(resolvedDurations(
      recipe({
        prepMinutes: 0,
        cookMinutes: 0,
        restMinutes: 0,
        aheadSteps: null,
        steps: ["Thaw overnight."],
      }),
      0,
      "Ribeye",
    ).aheadSteps).toEqual([{ label: "thaw", leadMinutes: 36 * 60 }]);
  });

  it("uses two to three days for a large roast or brisket, and a written hour count wins", () => {
    const roast = mealCookPlan({
      meal: meal({ id: "butt", title: "Pork butt", nightDate: FRIDAY }),
      recipe: recipe({
        mealId: "butt",
        cookMinutes: 0,
        restMinutes: 0,
        aheadSteps: null,
        steps: ["Move it from the freezer to the fridge."],
      }),
      timeZone: ZONE,
    });
    expect(roast.notices[0]).toMatchObject({
      showOn: WEDNESDAY,
      text: "Pull pork butt from freezer to thaw in fridge for Fri dinner",
    });

    const brisket = mealCookPlan({
      meal: meal({ id: "brisket", title: "Frozen brisket", nightDate: FRIDAY }),
      recipe: recipe({
        mealId: "brisket",
        cookMinutes: 0,
        restMinutes: 0,
        aheadSteps: null,
        steps: ["Season once it is thawed."],
      }),
      timeZone: ZONE,
    });
    expect(brisket.notices[0]?.showOn).toBe(TUESDAY);
    expect(brisket.notices[0]?.text).toBe(
      "Pull brisket from freezer to thaw in fridge for Fri dinner",
    );

    const longSmoke = mealCookPlan({
      meal: meal({ id: "brisket", title: "Brisket", nightDate: FRIDAY }),
      recipe: recipe({
        mealId: "brisket",
        cookMinutes: 22 * 60,
        restMinutes: 0,
        aheadSteps: null,
        steps: ["Thaw in the fridge.", "Smoke until 203°F."],
      }),
      timeZone: ZONE,
    });
    expect(longSmoke.notices.find((notice) => notice.text.startsWith("Pull"))?.showOn).toBe(MONDAY);

    const counted = mealCookPlan({
      meal: meal({ id: "ribeye", title: "Ribeye", nightDate: FRIDAY }),
      recipe: recipe({
        mealId: "ribeye",
        cookMinutes: 0,
        restMinutes: 0,
        aheadSteps: null,
        steps: ["Thaw for 48 hours.", "Sear."],
      }),
      timeZone: ZONE,
    });
    expect(counted.cookMinutes).toBe(0);
    expect(counted.notices[0]?.showOn).toBe(WEDNESDAY);

    const ranged = resolvedDurations(
      recipe({
        cookMinutes: 0,
        restMinutes: 0,
        aheadSteps: null,
        steps: ["Thaw 24 to 48 hours."],
      }),
      0,
      "Ribeye",
    );
    expect(ranged.aheadSteps).toEqual([{ label: "thaw", leadMinutes: 48 * 60 }]);
  });

  it("keeps an explicit thaw lead and ignores frozen food that is not meat", () => {
    const explicit = mealCookPlan({
      meal: meal({ id: "ribeye", title: "Freezer ribeye", nightDate: FRIDAY }),
      recipe: recipe({
        mealId: "ribeye",
        cookMinutes: 0,
        restMinutes: 0,
        aheadSteps: [{ label: "thaw", leadMinutes: 18 * 60 }],
        steps: ["Thaw overnight."],
      }),
      timeZone: ZONE,
    });
    expect(explicit.notices[0]?.showOn).toBe(THURSDAY);
    expect(
      resolvedDurations(
        recipe({
          cookMinutes: 0,
          restMinutes: 0,
          aheadSteps: [{ label: "thaw", leadMinutes: 18 * 60 }],
          steps: ["Thaw overnight."],
        }),
        0,
        "Freezer ribeye",
      ).aheadSteps[0]?.leadMinutes,
    ).toBe(18 * 60);

    const peas = mealCookPlan({
      meal: meal({ id: "peas", title: "Frozen peas", nightDate: FRIDAY, prepMinutes: 10 }),
      recipe: recipe({
        mealId: "peas",
        prepMinutes: 10,
        cookMinutes: 0,
        restMinutes: null,
        aheadSteps: null,
        steps: ["Heat the frozen peas."],
      }),
      timeZone: ZONE,
    });
    expect(peas.notices).toEqual([]);
    expect(peas.aheadLine).toBeNull();

    const decided = mealCookPlan({
      meal: meal({ id: "ribeye", title: "Freezer ribeye", nightDate: FRIDAY }),
      recipe: recipe({
        mealId: "ribeye",
        cookMinutes: 15,
        aheadSteps: [],
        steps: ["Thaw in the fridge."],
      }),
      timeZone: ZONE,
    });
    expect(decided.notices).toEqual([]);
  });

  it("shows a Sunday thaw on the previous week's Friday", () => {
    const notices = collectPrepNotices({
      weeks: [
        {
          meals: [meal({ id: "butt", title: "Pork butt", nightDate: SUNDAY })],
          recipes: [
            recipe({
              mealId: "butt",
              cookMinutes: 0,
              restMinutes: 0,
              aheadSteps: null,
              steps: ["Thaw in the fridge."],
            }),
          ],
          votes: [],
        },
      ],
      timeZone: ZONE,
      dinnerTime: DEFAULT_DINNER_TIME,
    });
    expect(notices).toEqual([
      {
        mealId: "butt",
        showOn: FRIDAY,
        text: "Pull pork butt from freezer to thaw in fridge for Sun dinner",
      },
    ]);

    const removed = collectPrepNotices({
      weeks: [
        {
          meals: [meal({ id: "butt", title: "Pork butt", nightDate: SUNDAY })],
          recipes: [
            recipe({
              mealId: "butt",
              cookMinutes: 0,
              restMinutes: 0,
              aheadSteps: null,
              steps: ["Thaw in the fridge."],
            }),
          ],
          votes: [
            {
              id: "vote",
              householdId: "house",
              mealId: "butt",
              membershipId: "member",
              choice: "remove",
              note: "",
              updatedAt: "2026-09-29T00:00:00.000Z",
            } satisfies Vote,
          ],
        },
      ],
      timeZone: ZONE,
    });
    expect(removed).toEqual([]);

    const past = renderToStaticMarkup(
      createElement(PastWeekDetail, {
        week: {
          startsOn: "2026-09-27",
          nights: [{ nightDate: FRIDAY, title: "Tacos", plates: 4 }],
        },
        notices,
      }),
    );
    expect(past).toContain("Pull pork butt from freezer to thaw in fridge for Sun dinner");
    expect(past).toContain('data-slot="past-week-night"');

    const loose = renderToStaticMarkup(
      createElement(PastWeekDetail, {
        week: { startsOn: "2026-09-27", nights: [{ nightDate: FRIDAY, title: "Tacos", plates: 4 }] },
        notices: [{ mealId: "ribeye", showOn: WEDNESDAY, text: "Pull ribeye from freezer to thaw in fridge for Fri dinner" }],
      }),
    );
    expect(loose).toContain("Pull ribeye from freezer to thaw in fridge for Fri dinner");
  });

  it("places a multi-day dry brine on the day it starts", () => {
    const plan = mealCookPlan({
      meal: meal({ title: "Roast chicken", nightDate: SUNDAY }),
      recipe: recipe({
        cookMinutes: 0,
        restMinutes: 0,
        aheadSteps: [{ label: "dry brine", leadMinutes: 48 * 60 }],
        steps: ["Roast until the thigh hits 165°F."],
      }),
      timeZone: ZONE,
    });
    expect(plan.notices).toEqual([
      {
        mealId: "shoulder",
        showOn: FRIDAY,
        text: "Tonight: prep for Sunday's roast chicken, dry brine",
      },
    ]);
  });

  it("falls back to 6:00 PM and accepts a Postgres time", () => {
    expect(resolveDinnerTime(null)).toBe("18:00");
    expect(resolveDinnerTime("18:00:00")).toBe("18:00");
    expect(parseAheadStepsColumn(null)).toBeNull();
    expect(parseAheadStepsColumn([{ label: "thaw", lead_minutes: 1440 }])).toEqual([
      { label: "thaw", leadMinutes: 1440 },
    ]);
  });
});

describe("cook timing surfaces", () => {
  it("formats the recipe chip and the week card", () => {
    const block = renderToStaticMarkup(
      createElement(RecipeBlock, {
        servings: 8,
        recipe: recipe(),
        cook: {
          meal: meal(),
          timeZone: ZONE,
          dinnerTime: "18:00",
        },
      }),
    );
    expect(block).toContain("10 hr 20 min");
    expect(block).not.toContain("620");
    expect(block).toContain("Start by 7:40 AM");
    expect(block).toContain("Prep ahead: inject + rub");

    const card = renderToStaticMarkup(
      createElement(BallotCard, {
        dayLabel: "Sat · Oct 3",
        title: "Pork shoulder",
        startBy: "Start by 7:40 AM",
        aheadLine: "Prep ahead: inject + rub",
      }),
    );
    expect(card).toContain('data-slot="start-by"');
    expect(card).toContain("Start by 7:40 AM");

    const notice = renderToStaticMarkup(
      createElement(AheadPrepNotice, {
        text: "Tonight: prep for tomorrow's pork shoulder, inject + rub, start smoker by 7:40 AM",
      }),
    );
    expect(notice).toContain('data-slot="ahead-prep"');
    expect(notice).toContain("start smoker by 7:40 AM");
  });

  it("wires the week, recipe, and bot docs", () => {
    const root = path.resolve(import.meta.dirname, "../..");
    const week = readFileSync(path.join(root, "src/app/week/page.tsx"), "utf8");
    const docs = readFileSync(path.join(root, "docs/bot-routines.md"), "utf8");
    const sql = readFileSync(
      path.join(root, "supabase/migrations/20260929235000_cook_timing.sql"),
      "utf8",
    );
    const recipes = readFileSync(path.join(root, "src/app/recipes/page.tsx"), "utf8");
    const paste = readFileSync(path.join(root, "src/lib/house-setup.ts"), "utf8");
    expect(week).toContain("AheadPrepNotice");
    expect(week).toContain("startBy=");
    expect(week).toContain("prepNoticesForHousehold");
    expect(recipes).toContain("prepNoticesForHousehold");
    expect(docs).toMatch(/ahead_steps/);
    expect(docs).toMatch(/36 hours for a steak/);
    expect(docs).toMatch(/48 hours for a large roast or pork butt/);
    expect(docs).toMatch(/72 hours for a brisket/);
    expect(paste).toMatch(/36 hours for a steak/);
    expect(docs).toMatch(/dinner_time/);
    expect(sql).toMatch(/rest_minutes/);
    expect(sql).toMatch(/ahead_steps/);
    expect(sql).toMatch(/dinner_time time not null default '18:00'/);
  });
});
