"use client";

import { useEffect, useState } from "react";

/** Keyboard / chrome inset below the visual viewport. SSR and missing vv → 0. */
export function visualViewportBottomInset(
  innerHeight: number,
  viewportHeight: number,
  offsetTop: number,
): number {
  return Math.max(0, innerHeight - viewportHeight - offsetTop);
}

export function visualViewportSheetMaxHeight(viewportHeight: number): string {
  if (viewportHeight <= 0) return "90dvh";
  return `min(90dvh, ${Math.max(0, viewportHeight - 12)}px)`;
}

type VisualViewportMetrics = {
  inset: number;
  height: number;
};

const SSR_METRICS: VisualViewportMetrics = { inset: 0, height: 0 };

function readVisualViewportMetrics(): VisualViewportMetrics {
  const vv = window.visualViewport;
  if (!vv) return SSR_METRICS;
  return {
    height: vv.height,
    inset: visualViewportBottomInset(window.innerHeight, vv.height, vv.offsetTop),
  };
}

function useVisualViewportMetrics(): VisualViewportMetrics {
  const [metrics, setMetrics] = useState<VisualViewportMetrics>(SSR_METRICS);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const sync = () => {
      setMetrics(readVisualViewportMetrics());
    };

    sync();
    vv.addEventListener("resize", sync);
    vv.addEventListener("scroll", sync);
    return () => {
      vv.removeEventListener("resize", sync);
      vv.removeEventListener("scroll", sync);
    };
  }, []);

  return metrics;
}

/** iOS Safari/PWA keyboard inset. SSR returns 0. */
export function useVisualViewportBottomInset(): number {
  return useVisualViewportMetrics().inset;
}

export function useVisualViewportHeight(): number {
  return useVisualViewportMetrics().height;
}
