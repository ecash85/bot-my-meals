export const DEMO_IDS = {
  household: "hh_gaines",
  timUser: "user_tim",
  roseUser: "user_rose",
  timMember: "mem_tim",
  roseMember: "mem_rose",
  storeTj: "store_tj",
  storeSmiths: "store_smiths",
  week: "week_current",
} as const;

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function inviteCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join(
    "",
  );
}

export function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
}
