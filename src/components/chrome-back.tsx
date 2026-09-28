"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export function ChromeBackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      data-slot="chrome-back"
      className="mt-2 mb-4 flex w-fit min-h-11 min-w-11 items-center gap-1 rounded-full py-3 pr-3 pl-1.5 text-[16px] leading-5 font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring dark:bg-[rgba(255,255,255,0.08)]"
    >
      <ChevronLeft aria-hidden className="size-5 shrink-0" />
      {label}
    </Link>
  );
}
