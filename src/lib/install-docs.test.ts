import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { grokPromptPaste } from "./install-docs";

const repoRoot = path.resolve(import.meta.dirname, "../..");

function readRepo(rel: string) {
  return readFileSync(path.join(repoRoot, rel), "utf8");
}

function expectOtpInstallHappyPath(doc: string) {
  expect(doc).toMatch(/Email OTP/);
  expect(doc).toMatch(/Send code/);
  expect(doc).toMatch(/6-digit/);
  expect(doc).toMatch(/Verify/);
  expect(doc).toMatch(/\{\{ \.Token \}\}/);
  expect(doc).toMatch(/custom SMTP/);
  expect(doc).toMatch(/auth\/callback/);
  expect(doc).not.toMatch(/Email me a sign-in link/);
  expect(doc).not.toMatch(/Enable Email magic link/);
  expect(doc).not.toMatch(/Gmail’s in-app browser/);
  expect(doc).not.toMatch(/open the (?:magic )?link on this same phone/i);
  expect(doc).not.toMatch(/after Request link/);
  expect(doc).not.toMatch(/grandma/i);
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
  expect(paste).toMatch(/stay quiet if nothing changed/);
  expect(paste).toMatch(/Never NEXT_PUBLIC/);
  expect(paste).toMatch(/do not show the full secret again/i);
  expect(paste).toMatch(/fallback/);
  expect(paste).not.toMatch(/Copy POST to and key/);
  expect(paste).not.toMatch(/NEXT_PUBLIC_BOT_WAKE/);
  expect(paste).not.toMatch(/grandma/i);
}

describe("Install docs — Email OTP + Wake on app event", () => {
  it("locks Auth, domains, and the #grok-prompt paste on Email OTP and Cos webhook wake", () => {
    const readme = readRepo("README.md");
    const domains = readRepo("docs/domains.md");
    const routines = readRepo("docs/bot-routines.md");
    const paste = grokPromptPaste(readme);

    expect(readme).toContain('id="grok-prompt"');
    expectOtpInstallHappyPath(readme);
    expectOtpInstallHappyPath(domains);
    expectOtpInstallHappyPath(paste);
    expectWakeInstallPaste(paste);

    expect(paste).toMatch(/Email OTP/);
    expect(paste).toMatch(/Send code/);
    expect(paste).toMatch(/Verify/);
    expect(paste).toMatch(/\{\{ \.Token \}\}/);
    expect(paste).toMatch(/custom SMTP/);
    expect(paste).toMatch(/auth\/callback/);
    expect(paste).toMatch(/Site URL/);
    expect(paste).toMatch(/not magic-link-only/);
    expect(paste).toMatch(/Do not turn on Apple\/Google for Install/);
    expect(paste).toMatch(/Optional later: passwords/);
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
  });

  it("does not ship a monorepo apps/app README or marketing check-pages", () => {
    expect(existsSync(path.join(repoRoot, "apps/app/README.md"))).toBe(false);
    expect(existsSync(path.join(repoRoot, "apps/marketing/scripts/check-pages.mjs"))).toBe(false);
    expect(existsSync(path.join(repoRoot, "apps/marketing/public/setup/index.html"))).toBe(false);
  });
});
