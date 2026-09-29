import { createElement } from "react";
import { readFileSync } from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AheadPrepNotice } from "@/components/ahead-prep";
import { BallotCard } from "@/components/ballot-card";
import { RecipeBlock } from "@/components/recipe-view";
import {
  DEFAULT_DINNER_TIME,
  mealCookPlan,
  parseAheadStepsColumn,
  resolveDinnerTime,
} from "./cook-timing";
import type { Recipe } from "./types";

const ZONE = "America/New_York";
const SATURDAY = "2026-10-03";
const FRIDAY = "2026-10-02";

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
    expect(week).toContain("AheadPrepNotice");
    expect(week).toContain("startBy=");
    expect(docs).toMatch(/ahead_steps/);
    expect(docs).toMatch(/dinner_time/);
    expect(sql).toMatch(/rest_minutes/);
    expect(sql).toMatch(/ahead_steps/);
    expect(sql).toMatch(/dinner_time time not null default '18:00'/);
  });
});
