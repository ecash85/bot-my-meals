import { addDays, WEEKDAY_LABELS, WEEKDAY_SHORT } from "./dates";
import { formatDuration } from "./duration";
import { isNightOff } from "./lock";
import type { AheadStep, Meal, Membership, Recipe, Vote } from "./types";

/**
 * Local serve time when `households.dinner_time` is missing.
 * Change this constant to move the fallback. Per-house overrides live in that column.
 */
export const DEFAULT_DINNER_TIME = "18:00";

/** A start before this hour (house local) is called out the previous evening. */
export const EARLY_START_HOUR = 9;

const FALLBACK_TIME_ZONE = "America/Los_Angeles";

/** Overnight with no explicit hour count. Lands on the previous evening for a 6 PM dinner. */
const DEFAULT_OVERNIGHT_LEAD_MINUTES = 18 * 60;

/** Fridge thaw when the recipe says thaw or frozen and gives no real thaw span. */
export const STEAK_THAW_MINUTES = 36 * 60;
/** A bare number shorter than this is not a fridge thaw. Salt and rest times live under it. */
const MIN_BARE_THAW_MINUTES = 6 * 60;
export const LARGE_CUT_THAW_MINUTES = 48 * 60;
export const BRISKET_THAW_MINUTES = 72 * 60;

const STEAK_CUT =
  /\b(ribeye|rib eye|picanha|ny strip|new york strip|strip steak|filet|fillet|sirloin|t-bone|porterhouse|flank|skirt|hanger|tri-?tip|flat iron|bavette|steak)\b/i;
const LARGE_CUT =
  /\b(pork shoulder|pork butt|boston butt|pulled pork|prime rib|rib roast|chuck roast|pot roast|beef roast|pork roast|leg of lamb|short ribs?)\b/i;
const SMOKE_HINT =
  /\b(smoker|pellet grill|on the smoker|pork shoulder|pulled pork|boston butt|brisket|short ribs?)\b|\bsmoke\b/i;

export type CookPlan = {
  prepMinutes: number;
  cookMinutes: number;
  restMinutes: number;
  totalMinutes: number;
  durationLabel: string | null;
  breakdown: string | null;
  startByLabel: string | null;
  /** Short reminder of overnight steps, shown on the dinner itself. */
  aheadLine: string | null;
  notices: PrepNotice[];
};

export type PrepNotice = {
  mealId: string;
  /** House-local date this line belongs on. Often the day before dinner. */
  showOn: string;
  text: string;
};

export type CookPlanInput = {
  meal: Pick<Meal, "id" | "title" | "nightDate" | "prepMinutes">;
  recipe?: Pick<
    Recipe,
    "prepMinutes" | "cookMinutes" | "restMinutes" | "aheadSteps" | "steps"
  > | null;
  timeZone: string;
  dinnerTime?: string | null;
};

export function mealCookPlan(input: CookPlanInput): CookPlan {
  const durations = resolvedDurations(input.recipe, input.meal.prepMinutes, input.meal.title);
  const total = durations.prepMinutes + durations.cookMinutes + durations.restMinutes;
  if (total <= 0 && durations.aheadSteps.length === 0) {
    return emptyPlan(durations);
  }

  const zone = resolveTimeZone(input.timeZone);
  const dinner = zonedDateTime(input.meal.nightDate, resolveDinnerTime(input.dinnerTime), zone);
  const start = total > 0 ? new Date(dinner.getTime() - total * 60_000) : null;
  const smoker = mentionsSmoker(input.meal.title, input.recipe?.steps ?? []);
  const notices = prepNotices({
    mealId: input.meal.id,
    title: input.meal.title,
    nightDate: input.meal.nightDate,
    dinner,
    start,
    aheadSteps: durations.aheadSteps,
    smoker,
    timeZone: zone,
  });

  return {
    ...durations,
    totalMinutes: total,
    durationLabel: total > 0 ? formatDuration(total) : null,
    breakdown: breakdownLabel(durations),
    startByLabel: start ? formatStartBy(start, input.meal.nightDate, zone) : null,
    aheadLine: aheadLine(durations.aheadSteps),
    notices,
  };
}

function aheadLine(steps: AheadStep[]): string | null {
  if (steps.length === 0) return null;
  return `Prep ahead: ${steps.map((step) => step.label).join(", ")}`;
}

export function resolvedDurations(
  recipe: CookPlanInput["recipe"],
  mealPrepMinutes: number,
  title = "",
): {
  prepMinutes: number;
  cookMinutes: number;
  restMinutes: number;
  aheadSteps: AheadStep[];
} {
  if (!recipe) {
    const prepMinutes = nonNegative(mealPrepMinutes);
    return {
      prepMinutes,
      cookMinutes: 0,
      restMinutes: 0,
      aheadSteps: inferredThawSteps({ title, steps: [], cookMinutes: 0, restMinutes: 0 }),
    };
  }

  const prepMinutes = nonNegative(recipe.prepMinutes);
  const storedCook = nonNegative(recipe.cookMinutes);
  const parsedCook = storedCook > 0 ? 0 : parseCookMinutes(recipe.steps ?? []);
  const cookMinutes =
    storedCook > 0
      ? storedCook
      : parsedCook != null && parsedCook >= 60 && parsedCook > prepMinutes
        ? parsedCook
        : 0;
  const restMinutes =
    typeof recipe.restMinutes === "number" && recipe.restMinutes >= 0
      ? Math.round(recipe.restMinutes)
      : (parseRestMinutes(recipe.steps ?? []) ?? 0);
  const steps = recipe.steps ?? [];
  const aheadSteps =
    recipe.aheadSteps == null
      ? [
          ...parseAheadFromSteps(steps),
          ...inferredThawSteps({ title, steps, cookMinutes, restMinutes }),
        ]
      : recipe.aheadSteps;

  return { prepMinutes, cookMinutes, restMinutes, aheadSteps };
}

/** Notices for every open week, so a thaw can sit on an earlier day than the dinner. */
export function collectPrepNotices(input: {
  weeks: Array<{
    meals: CookPlanInput["meal"][];
    recipes: Array<CookPlanInput["recipe"] & { mealId: string }>;
    votes: Vote[];
  }>;
  memberships?: Membership[];
  timeZone: string;
  dinnerTime?: string | null;
}): PrepNotice[] {
  return input.weeks.flatMap((week) =>
    week.meals.flatMap((meal) => {
      if (isNightOff(meal.id, week.votes, input.memberships)) return [];
      return mealCookPlan({
        meal,
        recipe: week.recipes.find((recipe) => recipe.mealId === meal.id),
        timeZone: input.timeZone,
        dinnerTime: input.dinnerTime,
      }).notices;
    }),
  );
}

/** Cooking week plus the open planning week, when that week exists. */
export function prepNoticesForHousehold(snapshot: {
  meals: CookPlanInput["meal"][];
  recipes: Array<CookPlanInput["recipe"] & { mealId: string }>;
  votes: Vote[];
  planning?: {
    meals: CookPlanInput["meal"][];
    recipes: Array<CookPlanInput["recipe"] & { mealId: string }>;
    votes: Vote[];
  } | null;
  memberships?: Membership[];
  household: { timezone: string; dinnerTime?: string | null };
}): PrepNotice[] {
  return collectPrepNotices({
    weeks: [
      { meals: snapshot.meals, recipes: snapshot.recipes, votes: snapshot.votes },
      ...(snapshot.planning
        ? [
            {
              meals: snapshot.planning.meals,
              recipes: snapshot.planning.recipes,
              votes: snapshot.planning.votes,
            },
          ]
        : []),
    ],
    memberships: snapshot.memberships,
    timeZone: snapshot.household.timezone,
    dinnerTime: snapshot.household.dinnerTime,
  });
}

export function resolveDinnerTime(value: string | null | undefined): string {
  if (!value) return DEFAULT_DINNER_TIME;
  const match = value.trim().match(/^(\d{1,2}):(\d{2})/);
  if (!match) return DEFAULT_DINNER_TIME;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return DEFAULT_DINNER_TIME;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

/** Column value from Postgres. Null means unset, so step text may fill it in. */
export function parseAheadStepsColumn(value: unknown): AheadStep[] | null {
  if (value == null) return null;
  if (!Array.isArray(value)) return null;
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    const label = typeof row.label === "string" ? row.label.trim() : "";
    const leadRaw = row.lead_minutes ?? row.leadMinutes;
    const lead = typeof leadRaw === "number" ? leadRaw : Number(leadRaw);
    if (!label || !Number.isFinite(lead) || lead <= 0) return [];
    return [{ label, leadMinutes: Math.round(lead) }];
  });
}

export function zonedDateTime(isoDate: string, time: string, timeZone: string): Date {
  const [year, month, day] = isoDate.split("-").map(Number);
  const [hour, minute] = resolveDinnerTime(time).split(":").map(Number);
  const zone = resolveTimeZone(timeZone);
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  const offset = timeZoneOffsetMs(utcGuess, zone);
  const first = new Date(utcGuess.getTime() - offset);
  const offset2 = timeZoneOffsetMs(first, zone);
  return new Date(utcGuess.getTime() - offset2);
}

export function formatClock(date: Date, timeZone: string): string {
  const parts = zonedParts(date, resolveTimeZone(timeZone));
  const hour12 = parts.hour % 12 || 12;
  const minute = String(parts.minute).padStart(2, "0");
  const period = parts.hour >= 12 ? "PM" : "AM";
  return `${hour12}:${minute} ${period}`;
}

function emptyPlan(durations: ReturnType<typeof resolvedDurations>): CookPlan {
  return {
    ...durations,
    totalMinutes: 0,
    durationLabel: null,
    breakdown: null,
    startByLabel: null,
    aheadLine: null,
    notices: [],
  };
}

function breakdownLabel(durations: ReturnType<typeof resolvedDurations>): string | null {
  const bits = [
    durations.prepMinutes > 0 ? `Prep ${formatDuration(durations.prepMinutes)}` : null,
    durations.cookMinutes > 0 ? `Cook ${formatDuration(durations.cookMinutes)}` : null,
    durations.restMinutes > 0 ? `Rest ${formatDuration(durations.restMinutes)}` : null,
  ].filter((bit): bit is string => Boolean(bit));
  if (bits.length < 2) return null;
  return bits.join(" · ");
}

function formatStartBy(start: Date, dinnerDate: string, timeZone: string): string {
  const clock = formatClock(start, timeZone);
  const localDate = zonedIsoDate(start, timeZone);
  if (localDate === dinnerDate) return `Start by ${clock}`;
  const weekday = WEEKDAY_LABELS[weekdayIndex(localDate)];
  return `Start by ${weekday} ${clock}`;
}

function prepNotices(input: {
  mealId: string;
  title: string;
  nightDate: string;
  dinner: Date;
  start: Date | null;
  aheadSteps: AheadStep[];
  smoker: boolean;
  timeZone: string;
}): PrepNotice[] {
  const buckets = new Map<string, { labels: string[]; start: Date | null }>();
  const bucketFor = (showOn: string) => {
    const existing = buckets.get(showOn);
    if (existing) return existing;
    const created = { labels: [] as string[], start: null as Date | null };
    buckets.set(showOn, created);
    return created;
  };

  if (input.start) {
    const showOn = surfaceDate(input.start, input.timeZone);
    if (showOn !== input.nightDate) bucketFor(showOn).start = input.start;
  }

  const thawNotices: PrepNotice[] = [];
  const pushThaw = (showOn: string, text: string) => {
    if (showOn === input.nightDate) return;
    if (!thawNotices.some((notice) => notice.showOn === showOn && notice.text === text)) {
      thawNotices.push({ mealId: input.mealId, showOn, text });
    }
  };
  for (const step of input.aheadSteps) {
    const when = new Date(input.dinner.getTime() - step.leadMinutes * 60_000);
    const showOnDates = aheadShowDates(when, input.timeZone, step.leadMinutes);
    if (isThawLabel(step.label)) {
      const pull = thawNoticeText(input.title, input.nightDate);
      const startDay = zonedIsoDate(when, input.timeZone);
      for (const showOn of showOnDates) {
        const text =
          showOn === startDay ? pull : `Tonight: ${pull.charAt(0).toLowerCase()}${pull.slice(1)}`;
        pushThaw(showOn, text);
      }
      continue;
    }
    for (const showOn of showOnDates) {
      if (showOn === input.nightDate) continue;
      const bucket = bucketFor(showOn);
      if (!bucket.labels.includes(step.label)) bucket.labels.push(step.label);
    }
  }

  const other = [...buckets.entries()].flatMap(([showOn, bucket]) => {
    const text = noticeText({
      showOn,
      dinnerDate: input.nightDate,
      title: input.title,
      labels: bucket.labels,
      start: bucket.start,
      smoker: input.smoker,
      timeZone: input.timeZone,
    });
    if (!text) return [];
    return [{ mealId: input.mealId, showOn, text }];
  });
  return [...thawNotices, ...other].sort(
    (a, b) => a.showOn.localeCompare(b.showOn) || a.text.localeCompare(b.text),
  );
}

function noticeText(input: {
  showOn: string;
  dinnerDate: string;
  title: string;
  labels: string[];
  start: Date | null;
  smoker: boolean;
  timeZone: string;
}): string {
  const mealRef =
    addDays(input.showOn, 1) === input.dinnerDate
      ? `tomorrow's ${sentenceTitle(input.title)}`
      : `${WEEKDAY_LABELS[weekdayIndex(input.dinnerDate)]}'s ${sentenceTitle(input.title)}`;
  const labels = input.labels.join(", ");
  const clock = input.start ? formatClock(input.start, input.timeZone) : null;
  const verb = input.smoker ? "start smoker" : "start";

  if (labels && clock) return `Tonight: prep for ${mealRef}, ${labels}, ${verb} by ${clock}`;
  if (labels) return `Tonight: prep for ${mealRef}, ${labels}`;
  if (clock && input.smoker) return `Tonight: start smoker for ${mealRef} by ${clock}`;
  if (clock) return `Tonight: start ${mealRef} by ${clock}`;
  return "";
}

function surfaceDate(when: Date, timeZone: string): string {
  const parts = zonedParts(when, timeZone);
  const date = isoFromParts(parts);
  if (parts.hour < EARLY_START_HOUR) return addDays(date, -1);
  return date;
}

/**
 * Days a step should appear. A lead of a day or more stays on the calendar day it starts.
 * If that instant is before 9 AM, the previous evening gets a card too.
 * Shorter leads still move a pre-9 AM start to the previous evening only.
 */
function aheadShowDates(when: Date, timeZone: string, leadMinutes: number): string[] {
  const startDay = zonedIsoDate(when, timeZone);
  if (leadMinutes >= 24 * 60) {
    const dates = [startDay];
    if (zonedParts(when, timeZone).hour < EARLY_START_HOUR) dates.push(addDays(startDay, -1));
    return dates;
  }
  return [surfaceDate(when, timeZone)];
}

function thawNoticeText(title: string, dinnerDate: string): string {
  const day = WEEKDAY_SHORT[weekdayIndex(dinnerDate)];
  return `Pull ${thawSubject(title)} from freezer to thaw in fridge for ${day} dinner`;
}

function thawSubject(title: string): string {
  const stripped = title.replace(/^\s*(freezer|frozen)\s+/i, "").trim();
  return sentenceTitle(stripped || title);
}

function isThawLabel(label: string): boolean {
  return /\b(thaw|frozen|freezer)\b/i.test(label);
}

function mentionsSmoker(title: string, steps: string[]): boolean {
  return SMOKE_HINT.test(`${title}\n${steps.join("\n")}`);
}

function sentenceTitle(title: string): string {
  const trimmed = title.trim();
  if (!trimmed) return "dinner";
  const second = trimmed.charAt(1);
  if (trimmed.charAt(0) !== trimmed.charAt(0).toLowerCase() && second === second.toLowerCase()) {
    return trimmed.charAt(0).toLowerCase() + trimmed.slice(1);
  }
  return trimmed;
}

function parseRestMinutes(steps: string[]): number | null {
  for (const step of steps) {
    const match = step.match(/\brest\b([^.]*)/i);
    if (!match) continue;
    const minutes = minutesFromPhrase(match[1] ?? "");
    if (minutes != null && minutes > 0) return minutes;
  }
  return null;
}

function parseCookMinutes(steps: string[]): number | null {
  let best: number | null = null;
  for (const step of steps) {
    if (isThawText(step) && !/\b(smoke|smoker|roast|braise|cook|simmer|bake|grill|oven)\b/i.test(step)) {
      continue;
    }
    if (/\brest\b/i.test(step) && !/\b(smoke|roast|braise|cook|simmer|bake)\b/i.test(step)) continue;
    const minutes = minutesFromPhrase(step);
    if (minutes == null || minutes < 60) continue;
    if (
      !/\b(smoke|smoker|roast|braise|cook|simmer|bake|grill|oven)\b/i.test(step) &&
      minutes < 90
    ) {
      continue;
    }
    if (best == null || minutes > best) best = minutes;
  }
  return best;
}

function parseAheadFromSteps(steps: string[]): AheadStep[] {
  const found: AheadStep[] = [];
  for (const step of steps) {
    if (!isAheadStep(step)) continue;
    const label = aheadLabel(step)
      ?.replace(/(^|\s\+\s)thaw(?=\s\+\s|$)/g, "")
      .replace(/^\s*\+\s*|\s*\+\s*$/g, "")
      .trim();
    if (!label) continue;
    const explicit = isThawText(step) ? null : minutesFromPhrase(step);
    const leadMinutes =
      explicit != null && explicit >= 60 ? explicit : DEFAULT_OVERNIGHT_LEAD_MINUTES;
    if (!found.some((item) => item.label === label)) found.push({ label, leadMinutes });
  }
  return found;
}

function inferredThawSteps(input: {
  title: string;
  steps: string[];
  cookMinutes: number;
  restMinutes: number;
}): AheadStep[] {
  const blob = `${input.title}\n${input.steps.join("\n")}`;
  if (!isThawText(blob)) return [];

  let explicit: number | null = null;
  for (const text of [input.title, ...input.steps]) {
    const minutes = thawSpanMinutes(text);
    if (minutes != null && (explicit == null || minutes > explicit)) explicit = minutes;
  }
  const thawMinutes = explicit ?? fridgeThawMinutes(input.title, input.steps);
  return [
    {
      label: "thaw",
      leadMinutes: thawMinutes + nonNegative(input.cookMinutes) + nonNegative(input.restMinutes),
    },
  ];
}

/** Hours tied to thaw, fridge, or defrost — or a bare span of at least ~6h. Salt and rest times do not count. */
function thawSpanMinutes(text: string): number | null {
  let best: number | null = null;
  for (const sentence of text.split(/[\n.;]+/)) {
    const minutes = minutesFromPhrase(sentence);
    if (minutes == null || !isThawSpan(sentence, minutes)) continue;
    if (best == null || minutes > best) best = minutes;
  }
  return best;
}

function isThawSpan(sentence: string, minutes: number): boolean {
  const thawOrDefrost = /\b(thaw|defrost)\b/i.test(sentence);
  const prepAside = /\b(salt|season|rest|sit)\b/i.test(sentence);
  const cookVerb = /\b(smoke|smoker|roast|braise|cook|simmer|bake|grill|oven|sear)\b/i.test(sentence);
  if (prepAside && !thawOrDefrost) return false;
  if (cookVerb && !thawOrDefrost && !/\bfridge\b/i.test(sentence)) return false;
  if (thawOrDefrost || /\bfridge\b/i.test(sentence)) return true;
  return minutes >= MIN_BARE_THAW_MINUTES;
}

/** Steaks 36h, large roasts and pork butt 48h, brisket 72h. Unknown frozen meat uses the steak window. */
export function fridgeThawMinutes(title: string, steps: readonly string[]): number {
  const blob = `${title}\n${steps.join("\n")}`;
  if (/\bbrisket\b/i.test(blob)) return BRISKET_THAW_MINUTES;
  if (LARGE_CUT.test(blob)) return LARGE_CUT_THAW_MINUTES;
  if (STEAK_CUT.test(blob)) return STEAK_THAW_MINUTES;
  return STEAK_THAW_MINUTES;
}

function isThawText(text: string): boolean {
  if (/\b(thaw|defrost|freezer)\b/i.test(text)) return true;
  if (/\bfrozen\b/i.test(text)) return true;
  return false;
}

function isAheadStep(step: string): boolean {
  if (/\b(overnight|night before|dry[\s-]?brine|marinat|thaw)/i.test(step)) return true;
  if (/\binject/i.test(step) && /\b(night|overnight|before|ahead|fridge)\b/i.test(step)) return true;
  return false;
}

function aheadLabel(step: string): string | null {
  const bits: string[] = [];
  if (/dry[\s-]?brine/i.test(step)) bits.push("dry brine");
  if (/inject/i.test(step)) bits.push("inject");
  if (/\brub/i.test(step)) bits.push("rub");
  if (/marinat/i.test(step)) bits.push("marinate");
  if (/thaw/i.test(step)) bits.push("thaw");
  if (bits.length) return bits.join(" + ");
  if (/\b(overnight|night before)\b/i.test(step)) {
    return /\bsmok/i.test(step) ? "overnight smoke" : "overnight prep";
  }
  return null;
}

function minutesFromPhrase(text: string): number | null {
  const range = text.match(
    /(\d+(?:\.\d+)?)\s*(?:–|-|to)\s*(\d+(?:\.\d+)?)\s*(days|hours|hrs|hr|minutes|mins|min)\b/i,
  );
  if (range) return toMinutes(Number(range[2]), range[3] ?? "");
  const one = text.match(/(\d+(?:\.\d+)?)\s*(days|hours|hrs|hr|minutes|mins|min)\b/i);
  if (!one) return null;
  return toMinutes(Number(one[1]), one[2] ?? "");
}

function toMinutes(amount: number, unit: string): number | null {
  if (!Number.isFinite(amount) || amount <= 0) return null;
  if (/day/i.test(unit)) return Math.round(amount * 24 * 60);
  return /hour|hr/i.test(unit) ? Math.round(amount * 60) : Math.round(amount);
}

function nonNegative(value: number | null | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return 0;
  return Math.round(value);
}

type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

function zonedParts(date: Date, timeZone: string): ZonedParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const read = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? "0");
  const hour = read("hour");
  return {
    year: read("year"),
    month: read("month"),
    day: read("day"),
    hour: hour === 24 ? 0 : hour,
    minute: read("minute"),
    second: read("second"),
  };
}

function timeZoneOffsetMs(instant: Date, timeZone: string): number {
  const parts = zonedParts(instant, timeZone);
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return asUtc - instant.getTime();
}

function zonedIsoDate(date: Date, timeZone: string): string {
  return isoFromParts(zonedParts(date, resolveTimeZone(timeZone)));
}

function isoFromParts(parts: Pick<ZonedParts, "year" | "month" | "day">): string {
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

function weekdayIndex(iso: string): number {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

function resolveTimeZone(timeZone: string): string {
  const candidate = timeZone.trim() || FALLBACK_TIME_ZONE;
  try {
    Intl.DateTimeFormat("en-US", { timeZone: candidate }).format(0);
    return candidate;
  } catch {
    return FALLBACK_TIME_ZONE;
  }
}
