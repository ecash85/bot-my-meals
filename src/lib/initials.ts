const LETTER = /[\p{L}\p{N}]/u;
const LETTERS = /[\p{L}\p{N}]/gu;

function firstLetter(word: string): string | null {
  const match = word.match(LETTER);
  return match ? match[0].toUpperCase() : null;
}

function lettersIn(word: string): string[] {
  return [...word.matchAll(LETTERS)].map((match) => match[0]);
}

/** Initials from a household member's display name. Never assumes specific people. */
export function memberInitials(displayName: string): string {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";

  if (parts.length === 1) {
    const letters = lettersIn(parts[0]);
    if (letters.length === 0) return "?";
    if (letters.length === 1) return letters[0].toUpperCase();
    return (letters[0] + letters[1]).toUpperCase();
  }

  const first = firstLetter(parts[0]);
  const last = firstLetter(parts[parts.length - 1]);
  if (!first && !last) return "?";
  if (!first) return last ?? "?";
  if (!last) return first;
  return first + last;
}

/** Single-letter mark for compact progress dots. */
export function memberProgressInitial(displayName: string): string {
  return memberInitials(displayName).slice(0, 1);
}
