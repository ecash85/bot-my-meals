"use client";

import { useRef, useState } from "react";

/**
 * Show `next` immediately, persist it, and fall back to the committed value
 * if that save fails. A newer commit wins over an older in-flight save.
 * Callers render the value only — this hook does not expose a busy flag.
 */
export function useOptimisticValue<T>(
  committed: T,
  persist: (next: T) => Promise<void>,
): { value: T; commit: (next: T) => void } {
  const [override, setOverride] = useState<{ id: number; value: T } | null>(null);
  const generation = useRef(0);

  const commit = (next: T) => {
    const id = ++generation.current;
    setOverride({ id, value: next });
    void persist(next).finally(() => {
      if (generation.current === id) setOverride(null);
    });
  };

  return {
    value: override === null ? committed : override.value,
    commit,
  };
}
