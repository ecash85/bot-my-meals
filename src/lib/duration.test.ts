import { describe, expect, it } from "vitest";
import { formatDuration, formatDurationSentence } from "./duration";

describe("formatDuration", () => {
  it("keeps plain minutes under an hour", () => {
    expect(formatDuration(0)).toBe("0 min");
    expect(formatDuration(1)).toBe("1 min");
    expect(formatDuration(45)).toBe("45 min");
    expect(formatDuration(59)).toBe("59 min");
  });

  it("shows hours and minutes at 60 or more", () => {
    expect(formatDuration(60)).toBe("1 hr");
    expect(formatDuration(61)).toBe("1 hr 1 min");
    expect(formatDuration(90)).toBe("1 hr 30 min");
    expect(formatDuration(620)).toBe("10 hr 20 min");
  });

  it("uses the sentence form under an hour", () => {
    expect(formatDurationSentence(1)).toBe("1 minute");
    expect(formatDurationSentence(45)).toBe("45 minutes");
    expect(formatDurationSentence(620)).toBe("10 hr 20 min");
  });
});
