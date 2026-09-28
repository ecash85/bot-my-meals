"use client";

import { useSyncExternalStore } from "react";

function subscribeSignInOrigin(): () => void {
  return () => {};
}

function signInOriginSnapshot(): string {
  return window.location.origin;
}

function signInOriginServerSnapshot(): string {
  return "";
}

export function useSignInOrigin(): string {
  return useSyncExternalStore(subscribeSignInOrigin, signInOriginSnapshot, signInOriginServerSnapshot);
}
