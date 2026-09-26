import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const LOCKED_192 = "public/brand/icon-chef-bot-only-192.png";
const LOCKED_512 = "public/brand/icon-chef-bot-only-512.png";
const LOCKED_180 = "public/brand/icon-chef-bot-only-180.png";
const LOCKED_FAVICON = "src/app/favicon.ico";

function copyLocked(srcRel, destRel) {
  const dest = join(root, destRel);
  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(join(root, srcRel), dest);
  console.log(`copied ${srcRel} -> ${destRel}`);
}

copyLocked(LOCKED_192, "public/icons/icon-192.png");
copyLocked(LOCKED_512, "public/icons/icon-512.png");
copyLocked(LOCKED_512, "public/icons/icon-maskable-512.png");
copyLocked(LOCKED_180, "public/icons/apple-touch-icon.png");
copyLocked(LOCKED_180, "public/apple-touch-icon.png");
copyLocked(LOCKED_192, "src/app/icon.png");
if (existsSync(join(root, LOCKED_FAVICON))) {
  copyLocked(LOCKED_FAVICON, "public/favicon.ico");
}
