import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const srcRoot = path.resolve(import.meta.dirname, "..");
const repoRoot = path.resolve(srcRoot, "..");

describe("create household cannot fail silently", () => {
  it("shows Join-a-table errors and keeps Create household wired", () => {
    const onboarding = readFileSync(path.join(srcRoot, "components/onboarding.tsx"), "utf8");
    const provider = readFileSync(path.join(srcRoot, "components/supper-provider.tsx"), "utf8");
    const repo = readFileSync(path.join(srcRoot, "lib/supabase/repo.ts"), "utf8");

    expect(onboarding).toContain("await createHousehold(name.trim() || CREATE_HOUSE_DEFAULT_NAME)");
    expect(onboarding).toContain("setError(err instanceof Error ? err.message : \"Could not create a household\")");
    expect(onboarding).toContain('role="alert"');
    expect(onboarding).toContain("error ?? loadError");
    expect(onboarding).toContain('aria-label={busy ? "Creating household" : "Create household"}');
    expect(onboarding).toContain("CREATE_HOUSE_TITLE");
    expect(onboarding).not.toContain("Join a table");
    expect(onboarding).not.toContain("Join with code");
    expect(onboarding).not.toContain('aria-label="Invite code"');
    expect(onboarding).not.toContain("joinHousehold");
    expect(onboarding).not.toContain("Hi {");
    expect(onboarding).not.toContain("displayName");
    expect(onboarding).not.toContain("catch {");
    expect(onboarding).not.toContain("catch ()");

    expect(provider).toContain("await supabaseCreateHousehold(client, name)");
    expect(repo).toContain("if (!householdName)");
    expect(repo).toContain("Give the household a name.");
    expect(repo).toContain("HOUSEHOLD_NOT_VISIBLE");
    expect(repo).toContain("if (membershipError) throw new Error(membershipError.message)");
  });

  it("grants USAGE on schema private so RLS can see the new membership", () => {
    const migrationsDir = path.join(srcRoot, "../supabase/migrations");
    const grant = "20260917120000_grant_private_schema_usage.sql";
    const setup = "20260917140000_house_setup_join_tokens.sql";
    const wizardV2 = "20260917160000_wizard_v2_ballot_request.sql";
    expect(existsSync(path.join(migrationsDir, grant))).toBe(true);
    expect(existsSync(path.join(migrationsDir, setup))).toBe(true);
    expect(existsSync(path.join(migrationsDir, wizardV2))).toBe(true);

    const sql = readFileSync(path.join(migrationsDir, grant), "utf8");
    expect(sql).toMatch(/grant usage on schema private to authenticated/i);
    expect(sql).toMatch(/raise exception 'Give the household a name\.'/);
    expect(sql).toMatch(/order by m\.created_at asc/);

    const files = readdirSync(migrationsDir).filter((name) => name.endsWith(".sql")).sort();
    expect(files).toContain(grant);
    expect(files).toContain(setup);
    expect(files).toContain(wizardV2);

    const readme = readFileSync(path.join(repoRoot, "README.md"), "utf8");
    expect(readme).toContain(grant);
    expect(readme).toContain(setup);
    expect(readme).toContain(wizardV2);
    expect(readme).toMatch(/all eight/);
  });
});
