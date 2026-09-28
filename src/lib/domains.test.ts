import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(import.meta.dirname, "../..");

function readRepo(rel: string) {
  return readFileSync(path.join(repoRoot, rel), "utf8");
}

function jsoncWithoutLineComments(src: string) {
  return src.replace(/^\s*\/\/.*$/gm, "");
}

describe("domain + auth DIY docs", () => {
  it("locks DIY hosts and Auth allowlist off {handle}", () => {
    const domains = readRepo("docs/domains.md");
    const readme = readRepo("README.md");

    expect(domains).toMatch(/bot-my-meals\.<your-subdomain>\.workers\.dev/);
    expect(domains).toMatch(/Site URL/);
    expect(domains).toMatch(/auth\/callback/);
    expect(domains).toMatch(/does not flip DNS/);
    expect(domains).toMatch(/Email OTP/);
    expect(domains).toMatch(/Send code/);
    expect(domains).toMatch(/Verify/);
    expect(domains).toMatch(/\{\{ \.Token \}\}/);
    expect(domains).toMatch(/custom SMTP/);
    expect(domains).not.toMatch(/Email me a sign-in link/);
    expect(domains).not.toMatch(/Enable Email magic link/);
    expect(domains).not.toMatch(/Gmail’s in-app browser/);
    expect(domains).not.toMatch(/grandma/i);
    expect(domains).not.toMatch(/\{handle\}\.botmymeals\.com is the DIY/);
    expect(domains).not.toMatch(/timdoes\.botmymeals\.com/);
    expect(domains).not.toMatch(/tim-4dd\.workers\.dev/);

    expect(readme).toMatch(/bot-my-meals\.<your-subdomain>\.workers\.dev/);
    expect(readme).toMatch(/docs\/domains\.md/);
    expect(readme).toMatch(/Email OTP/);
    expect(readme).toMatch(/Send code/);
    expect(readme).toMatch(/Verify/);
    expect(readme).not.toMatch(/Email me a sign-in link/);
    expect(readme).not.toMatch(/grandma/i);
    expect(readme).not.toMatch(/timdoes\.botmymeals\.com/);
    expect(readme).not.toMatch(/tim-4dd\.workers\.dev/);
  });

  it("keeps wrangler custom domains commented so deploy cannot attach DNS", () => {
    const appWrangler = readRepo("wrangler.jsonc");

    expect(appWrangler).toMatch(/Do not uncomment/);
    expect(appWrangler).not.toMatch(/timdoes\.botmymeals\.com/);

    const appConfig = JSON.parse(jsoncWithoutLineComments(appWrangler));
    expect(appConfig.name).toBe("bot-my-meals");
    expect(appConfig.routes).toBeUndefined();
  });
});
