/**
 * Under an hour stays plain minutes ("45 min" / "45 minutes").
 * 60 minutes or more is hours and minutes ("10 hr 20 min").
 */
export function formatDuration(minutes: number): string {
  const rounded = wholeMinutes(minutes);
  if (rounded < 60) return `${rounded} min`;
  const hours = Math.floor(rounded / 60);
  const rest = rounded % 60;
  return rest === 0 ? `${hours} hr` : `${hours} hr ${rest} min`;
}

/** Sentence form used after "About". */
export function formatDurationSentence(minutes: number): string {
  const rounded = wholeMinutes(minutes);
  if (rounded < 60) return rounded === 1 ? "1 minute" : `${rounded} minutes`;
  return formatDuration(rounded);
}

function wholeMinutes(minutes: number): number {
  if (!Number.isFinite(minutes)) return 0;
  return Math.max(0, Math.round(minutes));
}
