"use client";

import { useRef, useState } from "react";

/**
 * Show `next` immediately, persist it, and fall back to the committed value
 * if that save fails. A newer commit wins over an older in-flight save.
 */
export function useOptimisticValue<T>(
  committed: T,
  persist: (next: T) => Promise<void>,
): { value: T; pending: boolean; commit: (next: T) => void } {
  const [override, setOverride] = useState<{ id: number; value: T } | null>(null);
  const [pending, setPending] = useState(false);
  const generation = useRef(0);
  const inflight = useRef(0);

  const commit = (next: T) => {
    const id = ++generation.current;
    inflight.current += 1;
    setOverride({ id, value: next });
    setPending(true);
    void persist(next).finally(() => {
      inflight.current -= 1;
      if (generation.current === id) setOverride(null);
      if (inflight.current === 0) setPending(false);
    });
  };

  return {
    value: override === null ? committed : override.value,
    pending,
    commit,
  };
}
