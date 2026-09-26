import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { JOIN_CTA, JOIN_HELPER, JOIN_HOUSE_SAMPLE, JOIN_TITLE, joinInviteBody } from "./join";
import {
  CHECK_EMAIL_DIFFERENT,
  CHECK_EMAIL_HELPER,
  CHECK_EMAIL_RESEND,
  CHECK_EMAIL_STATUS,
  CHECK_EMAIL_TITLE,
  checkEmailBody,
} from "./login";
import { CREATE_HOUSE_DEFAULT_NAME, CREATE_HOUSE_TITLE } from "./setup";

const srcRoot = path.resolve(import.meta.dirname, "..");

describe("setup polish copy lock", () => {
  it("keeps magic-link sent as a confirmation card, not a primary Link sent button", () => {
    expect(CHECK_EMAIL_TITLE).toBe("Check your email");
    expect(checkEmailBody("alex@example.com")).toBe(
      "We sent a sign-in link to alex@example.com. Open it on this same phone (Safari, not Gmail’s in-app browser).",
    );
    expect(CHECK_EMAIL_HELPER).toBe(
      "Opening the link on another device sends you back here.",
    );
    expect(CHECK_EMAIL_RESEND).toBe("Resend");
    expect(CHECK_EMAIL_DIFFERENT).toBe("Use a different email");
    expect(CHECK_EMAIL_STATUS).toBe("Link on its way");

    const login = readFileSync(path.join(srcRoot, "components/login-home.tsx"), "utf8");
    const card = readFileSync(path.join(srcRoot, "components/check-email-card.tsx"), "utf8");
    expect(login).toContain("CheckEmailCard");
    expect(login).not.toContain("Link sent");
    expect(card).toContain('data-slot="check-email"');
    expect(card).toContain('role="status"');
    expect(card).toContain('variant="link"');
    expect(card).not.toContain('variant="primary"');
    expect(card).not.toContain("Link sent");
  });

  it("kills invite-code UI and keeps first-timers on one create path", () => {
    expect(JOIN_TITLE).toBe("You’re invited");
    expect(JOIN_CTA).toBe("Continue");
    expect(JOIN_HELPER).toBe("One household. No invite code to type.");
    expect(JOIN_HOUSE_SAMPLE).toBe("Our house");
    expect(joinInviteBody("Our house")).toMatch(/This link opens Our house/);
    expect(CREATE_HOUSE_TITLE).toBe("Create household");
    expect(CREATE_HOUSE_DEFAULT_NAME).toBe("Our house");

    const onboarding = readFileSync(path.join(srcRoot, "components/onboarding.tsx"), "utf8");
    const landing = readFileSync(path.join(srcRoot, "components/join-landing.tsx"), "utf8");
    const share = readFileSync(path.join(srcRoot, "components/invite-share.tsx"), "utf8");
    const wizard = readFileSync(path.join(srcRoot, "components/setup-wizard.tsx"), "utf8");
    const house = readFileSync(path.join(srcRoot, "app/settings/page.tsx"), "utf8");

    expect(onboarding).not.toContain("Join a table");
    expect(onboarding).not.toContain("joinHousehold");
    expect(onboarding).not.toContain("displayName");
    expect(landing).toContain("hideNav");
    expect(landing).not.toContain("Create your own");
    expect(landing).not.toContain("Join with code");
    expect(share).not.toContain("Invite code");
    expect(share).not.toContain("inviteCode");
    expect(wizard).not.toContain("inviteCode");
    expect(house).not.toContain("inviteCode={");
    expect(onboarding).not.toMatch(/\bTim\b/);
    expect(onboarding).not.toMatch(/\bRose\b/);
    expect(landing).not.toMatch(/\bTim\b/);
    expect(landing).not.toMatch(/\bRose\b/);
  });

  it("keeps the people stepper and replaces nights-count chips with Sun–Sat toggles", () => {
    const wizard = readFileSync(path.join(srcRoot, "components/setup-wizard.tsx"), "utf8");
    const toggles = readFileSync(path.join(srcRoot, "components/night-toggles.tsx"), "utf8");
    expect(wizard).toContain("household-size");
    expect(wizard).toContain("NightToggles");
    expect(wizard).toContain("hideNav");
    expect(wizard).toContain("compactOffNights");
    expect(wizard).not.toContain("[1, 2, 3, 4, 5, 6, 7]");
    expect(wizard).not.toContain("nights-planned");
    expect(toggles).toContain("WEEKDAY_LABELS");
    expect(toggles).toContain('data-slot="night-toggles"');
    expect(toggles).toContain("Switch");
    expect(wizard).not.toMatch(/>\s*Skip\s*</);
  });
});
