import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { grokPromptPaste } from "./install-docs";

const repoRoot = path.resolve(import.meta.dirname, "../..");

function readRepo(rel: string) {
  return readFileSync(path.join(repoRoot, rel), "utf8");
}

function expectPasswordInstallHappyPath(doc: string) {
  expect(doc).toMatch(/Confirm email OFF/);
  expect(doc).toMatch(/email \+ password/);
  expect(doc).toMatch(/Create account/);
  expect(doc).toMatch(/Sign in/);
  expect(doc).toMatch(/not a magic link/);
  expect(doc).toMatch(/Optional later: custom SMTP/);
  expect(doc).toMatch(/\{\{ \.Token \}\}/);
  expect(doc).toMatch(/auth\/callback/);
  expect(doc).toMatch(/login\/new-password/);
  expect(doc).toMatch(/at least 8/);
  expect(doc).toMatch(/no shared household password/i);
  expect(doc).not.toMatch(/Email OTP/);
  expect(doc).not.toMatch(/Send code/);
  expect(doc).not.toMatch(/Add custom SMTP/);
  expect(doc).not.toMatch(/need email codes/);
  expect(doc).not.toMatch(/first sign-in code/);
  expect(doc).not.toMatch(/Email me a sign-in link/);
  expect(doc).not.toMatch(/Enable Email magic link/);
  expect(doc).not.toMatch(/Gmail’s in-app browser/);
  expect(doc).not.toMatch(/open the (?:magic )?link on this same phone/i);
  expect(doc).not.toMatch(/after Request link/);
  expect(doc).not.toMatch(/grandma/i);
  expect(doc).not.toMatch(/email verified/i);
}

function expectWakeInstallPaste(paste: string) {
  expect(paste).toMatch(/Wake on app event/);
  expect(paste).toMatch(/Webhook URL/);
  expect(paste).toMatch(/House → Wake your Bot/);
  expect(paste).toMatch(/BOT_WAKE_WEBHOOK_URL/);
  expect(paste).toMatch(/BOT_WAKE_WEBHOOK_KEY/);
  expect(paste).toMatch(/sender key/);
  expect(paste).toMatch(/webhook trigger/);
  expect(paste).toMatch(/ballot \/ recipes \/ shopping list \/ setup/);
  expect(paste).toMatch(/for the week that needs work/);
  expect(paste).toMatch(/stay quiet if nothing changed/);
  expect(paste).toMatch(/Never NEXT_PUBLIC/);
  expect(paste).toMatch(/do not show the full secret again/i);
  expect(paste).toMatch(/fallback/);
  expect(paste).not.toMatch(/Copy POST to and key/);
  expect(paste).not.toMatch(/NEXT_PUBLIC_BOT_WAKE/);
  expect(paste).not.toMatch(/grandma/i);
}

function expectStripNavigatorInstallPaste(doc: string) {
  expect(doc).toMatch(/horizontal swipe/);
  expect(doc).toMatch(/date strip/);
  expect(doc).toMatch(/edge ‹ ›/);
  expect(doc).toMatch(/they are status, not the switcher/);
  expect(doc).toMatch(/This week/);
  expect(doc).toMatch(/Next week/);
  expect(doc).toMatch(/no chip row/);
  expect(doc).toMatch(/cannot open a week-after-next/);
  expect(doc).toMatch(/titles only/);
  expect(doc).toMatch(/House → Past weeks/);
  expect(doc).toMatch(/Plan next week/);
  expect(doc).toMatch(/0 gap/);
  expect(doc).not.toMatch(/This week \| Next week switcher/);
  expect(doc).not.toMatch(/When both exist, (?:a \*\*)?This week \| Next week/);
  expect(doc).not.toMatch(/the app shows a This week \| Next week switcher/);
}

function expectDualWeekInstallPaste(paste: string) {
  expect(paste).toMatch(/Create this week's meals/);
  expect(paste).toMatch(/do not create a planning week during setup/);
  expect(paste).toMatch(/one cooking week \+ one planning week/);
  expect(paste).toMatch(/Do not open a third week/);
  expect(paste).toMatch(/Home always opens on the cooking week/);
  expectStripNavigatorInstallPaste(paste);
  expect(paste).toMatch(/week-scoped/);
  expect(paste).toMatch(/Waiting, Lock, recipes, shopping, Check now, and Wake/);
  expect(paste).toMatch(/Shopping · This week/);
  expect(paste).toMatch(/Shopping · Next week/);
  expect(paste).toMatch(/never merge cooking \+ planning/);
  expect(paste).toMatch(/Request for next week/);
  expect(paste).toMatch(/planning week/);
  expect(paste).toMatch(/needs_work is true on any open week/);
  expect(paste).toMatch(/Fulfill by week/);
  expect(paste).toMatch(
    /Do not treat a settled cooking week as idle if the planning week still needs work/,
  );
  expect(paste).toMatch(/for the week that needs work/);
  expect(paste).not.toMatch(/7\) Tap Plan next week/);
  expect(paste).not.toMatch(/grandma/i);
}

function expectDualWeekProductLoop(readme: string) {
  expect(readme).toMatch(/Install does not create a planning week/);
  expect(readme).toMatch(/one cooking week \+ one planning week/);
  expectStripNavigatorInstallPaste(readme);
  expect(readme).toMatch(/Shopping · This week/);
  expect(readme).toMatch(/Shopping · Next week/);
  expect(readme).toMatch(/never merge cooking \+ planning/);
  expect(readme).toMatch(/Request for next week/);
  expect(readme).toMatch(/needs_work/);
  expect(readme).not.toMatch(/grandma/i);
}

describe("Install docs — email + password + Wake on app event", () => {
  it("locks Auth, domains, and the #grok-prompt paste on password sign-in and Cos webhook wake", () => {
    const readme = readRepo("README.md");
    const domains = readRepo("docs/domains.md");
    const routines = readRepo("docs/bot-routines.md");
    const paste = grokPromptPaste(readme);

    expect(readme).toContain('id="grok-prompt"');
    expectPasswordInstallHappyPath(readme);
    expectPasswordInstallHappyPath(domains);
    expectPasswordInstallHappyPath(paste);
    expectWakeInstallPaste(paste);
    expectDualWeekInstallPaste(paste);
    expectDualWeekProductLoop(readme);

    expect(paste).toMatch(/Confirm email OFF/);
    expect(paste).toMatch(/email \+ password/);
    expect(paste).toMatch(/Create account/);
    expect(paste).toMatch(/Sign in/);
    expect(paste).toMatch(/\{\{ \.Token \}\}/);
    expect(paste).toMatch(/Optional later: custom SMTP/);
    expect(paste).toMatch(/Do not require custom SMTP/);
    expect(paste).toMatch(/auth\/callback/);
    expect(paste).toMatch(/login\/new-password/);
    expect(paste).toMatch(/at least 8/);
    expect(paste).toMatch(/Site URL/);
    expect(paste).toMatch(/not a magic link/);
    expect(paste).toMatch(/Do not turn on Apple or Google for Install/);
    expect(paste).not.toMatch(/Optional later: passwords/);
    expect(paste).toMatch(/Passkeys later/);
    expect(paste).toMatch(/easy for anyone/);
    expect(paste).toMatch(/cart adds only where the store actually supports them/);
    expect(paste).toMatch(/Do NOT invent prices/);
    expect(paste).toMatch(/Do NOT claim unsupported cart features/);
    expect(paste).not.toMatch(/Email me a sign-in link/);
    expect(paste).not.toMatch(/Enable Email magic link/);
    expect(paste).not.toMatch(/Gmail’s in-app browser/);
    expect(paste).not.toMatch(/open the (?:magic )?link on this same phone/i);
    expect(paste).not.toMatch(/after Request link/);
    expect(paste).not.toMatch(/grandma/i);
    expect(paste).not.toMatch(/no store cart-add claims/);

    expect(readme).toMatch(/Wake on app event/);
    expect(readme).toMatch(/Webhook URL/);
    expect(readme).toMatch(/House → Wake your Bot/);
    expect(readme).toMatch(/BOT_WAKE_WEBHOOK_URL/);
    expect(readme).not.toMatch(/grandma/i);

    expect(routines).toMatch(/Wake on app event/);
    expect(routines).toMatch(/Webhook URL/);
    expect(routines).toMatch(/House → Wake your Bot/);
    expect(routines).toMatch(/BOT_WAKE_WEBHOOK_URL/);
    expect(routines).toMatch(/BOT_WAKE_WEBHOOK_KEY/);
    expect(routines).toMatch(/sender key/);
    expect(routines).toMatch(/Never `NEXT_PUBLIC_`/);
    expect(routines).toMatch(/Saved · Replace/);
    expect(routines).toMatch(/stay quiet if nothing changed/);
    expect(routines).toMatch(/fallback/);
    expect(routines).not.toMatch(/Copy \*\*POST to\*\* \(the webhook URL\) and \*\*key\*\*/);
    expect(routines).not.toMatch(/grandma/i);
    expect(routines).toMatch(/any open week/);
    expect(routines).toMatch(/for the week that needs work/);
    expect(routines).toMatch(/Shopping · This week/);
    expect(routines).toMatch(/Shopping · Next week/);
    expect(routines).toMatch(/do not merge this week with next week/);
    expect(routines).toMatch(/horizontal swipe/);
    expect(routines).toMatch(/date strip/);
    expect(routines).toMatch(/edge ‹ ›/);
    expect(routines).toMatch(/no chip row|not a chip row/);
    expect(routines).toMatch(/status, not the switcher/);
    expect(routines).not.toMatch(/This week \| Next week switcher/);
  });

  it("locks dual-week Install paste after first-ballot setup without forcing a planning week on day 1", () => {
    const readme = readRepo("README.md");
    const routines = readRepo("docs/bot-routines.md");
    const saved = readRepo("docs/saved-meals.md");
    const paste = grokPromptPaste(readme);

    expectPasswordInstallHappyPath(paste);
    expectWakeInstallPaste(paste);
    expectDualWeekInstallPaste(paste);
    expectDualWeekProductLoop(readme);

    const setupAt = paste.indexOf("After Create household, walk through house setup");
    const firstBallotAt = paste.indexOf("Tap Create this week's meals");
    const dualWeekAt = paste.indexOf("After the first ballot is live");
    expect(setupAt).toBeGreaterThan(-1);
    expect(firstBallotAt).toBeGreaterThan(setupAt);
    expect(dualWeekAt).toBeGreaterThan(firstBallotAt);

    expect(saved).toMatch(/Request for next week/);
    expect(saved).toMatch(/planning week/);
    expect(saved).toMatch(/Requested for next week/);
    expect(saved).toMatch(/will not open a week after next/);
    expect(saved).toMatch(/do not say this week/);
    expect(saved).toMatch(/Plan next week/);
    expect(saved).toMatch(/same create path/);
    expect(saved).toMatch(/will not invent a third open week/);
    expect(saved).not.toMatch(/grandma/i);

    expect(routines).toMatch(/Waiting titles name/);
    expect(routines).toMatch(/Shopping · This week/);
    expect(routines).toMatch(/fulfill `reason` for the week that needs work/);
    expect(routines).toMatch(/horizontal swipe/);
    expect(routines).toMatch(/not a chip row/);
  });

  it("does not ship a monorepo apps/app README or marketing check-pages", () => {
    expect(existsSync(path.join(repoRoot, "apps/app/README.md"))).toBe(false);
    expect(existsSync(path.join(repoRoot, "apps/marketing/scripts/check-pages.mjs"))).toBe(false);
    expect(existsSync(path.join(repoRoot, "apps/marketing/public/setup/index.html"))).toBe(false);
  });
});
