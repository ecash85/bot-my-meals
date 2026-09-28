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

describe("Install docs — Email OTP", () => {
  it("locks Auth, domains, and the #grok-prompt paste on Email OTP", () => {
    const readme = readRepo("README.md");
    const domains = readRepo("docs/domains.md");
    const paste = grokPromptPaste(readme);

    expect(readme).toContain('id="grok-prompt"');
    expectOtpInstallHappyPath(readme);
    expectOtpInstallHappyPath(domains);

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
    expect(paste).not.toMatch(/webhook-wake/i);
  });

  it("does not ship a monorepo apps/app README or marketing check-pages", () => {
    expect(existsSync(path.join(repoRoot, "apps/app/README.md"))).toBe(false);
    expect(existsSync(path.join(repoRoot, "apps/marketing/scripts/check-pages.mjs"))).toBe(false);
    expect(existsSync(path.join(repoRoot, "apps/marketing/public/setup/index.html"))).toBe(false);
  });
});
