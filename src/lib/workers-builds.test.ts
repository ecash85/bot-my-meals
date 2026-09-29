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

describe("Workers Builds deploy docs", () => {
  it("locks dashboard commands", () => {
    const docs = readRepo("docs/workers-builds.md");
    const readme = readRepo("README.md");

    expect(readme).not.toMatch(/grandma/i);
    expect(readme).toMatch(/Confirm email OFF/);
    expect(readme).toMatch(/email \+ password/);
    expect(readme).toMatch(/Create account/);
    expect(readme).toMatch(/not a magic link/);
    expect(readme).toMatch(/\{\{ \.Token \}\}/);
    expect(readme).toMatch(/Optional later: custom SMTP/);
    expect(readme).not.toMatch(/Email OTP/);
    expect(readme).not.toMatch(/Send code/);
    expect(readme).not.toMatch(/Add custom SMTP/);
    expect(readme).not.toMatch(/Email me a sign-in link/);
    expect(readme).not.toMatch(/Enable Email magic link/);
    expect(readme).not.toMatch(/Gmail’s in-app browser/);
    expect(readme).toMatch(/cart adds only where the store actually supports them/);
    expect(readme).toMatch(/Do NOT invent prices/);

    expect(docs).toMatch(/npm run build:worker/);
    expect(docs).toMatch(/node scripts\/cf-deploy\.mjs/);
    expect(docs).not.toMatch(/Build command \| `npx opennextjs-cloudflare build`/);
    expect(docs).toMatch(/Build watch paths/);
    expect(docs).toMatch(/does not deploy and does not flip DNS/);
    expect(docs).not.toMatch(/apps\/marketing/);
    expect(docs).not.toMatch(/build:marketing/);

    expect(readme).toMatch(/docs\/workers-builds\.md/);
    expect(readme).toMatch(/npm run build:worker/);
    expect(readme).toMatch(/node scripts\/cf-deploy\.mjs/);
    expect(readme).not.toMatch(/apps\/marketing/);
  });

  it("keeps Worker name bot-my-meals at repo root", () => {
    const docs = readRepo("docs/workers-builds.md");
    const appWrangler = JSON.parse(
      jsoncWithoutLineComments(readRepo("wrangler.jsonc")),
    );
    const rootPkg = JSON.parse(readRepo("package.json"));

    expect(appWrangler.name).toBe("bot-my-meals");
    expect(appWrangler.keep_vars).toBe(true);
    expect(appWrangler.env).toBeUndefined();
    expect(docs).toMatch(/keep_vars/);
    expect(docs).toMatch(/leave blank \(repo root\)/);

    const deploy = readRepo("scripts/cf-deploy.mjs");
    expect(deploy).not.toMatch(/--keep-vars/);
    expect(deploy).not.toMatch(/--var\b/);
    expect(readRepo("package.json")).toMatch(/"deploy:preview": "wrangler versions upload"/);
    expect(rootPkg.scripts["build:worker"]).toMatch(/opennextjs-cloudflare build/);
    expect(rootPkg.scripts["deploy:marketing"]).toBeUndefined();
    expect(rootPkg.name).toBe("bot-my-meals");
  });

  it("keeps GitHub Actions as a CI gate with no Cloudflare deploy secret", () => {
    const ci = readRepo(".github/workflows/ci.yml");
    const readme = readRepo("README.md");

    expect(ci).toMatch(/npm run build:worker/);
    expect(ci).not.toMatch(/build:marketing/);
    expect(ci).not.toMatch(/wrangler deploy/);
    expect(ci).not.toMatch(/secrets\.CLOUDFLARE_API_TOKEN/);
    expect(ci).not.toMatch(/cloudflare\/wrangler-action/);
    expect(readme).toMatch(/Actions does \*\*not\*\* deploy/);
    expect(readme).toMatch(/CLOUDFLARE_API_TOKEN/);
  });
});
