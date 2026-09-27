"use client";

import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, ClipboardList, Settings2, Utensils } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/week", label: "This week", icon: Utensils },
  { href: "/recipes", label: "Recipes", icon: BookOpen },
  { href: "/list", label: "List", icon: ClipboardList },
  { href: "/settings", label: "House", icon: Settings2 },
];

export function AppShell({
  title,
  eyebrow,
  backHref,
  backLabel = "This week",
  status,
  footer,
  hideNav = false,
  children,
}: {
  title: string;
  eyebrow?: string;
  backHref?: string;
  backLabel?: string;
  status?: ReactNode;
  footer?: ReactNode;
  hideNav?: boolean;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const headRef = useRef<HTMLDivElement>(null);
  const [headH, setHeadH] = useState(0);

  useLayoutEffect(() => {
    const el = headRef.current;
    if (!el) return;
    const update = () => setHeadH(el.offsetHeight);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      className="mx-auto flex min-h-dvh w-full max-w-lg flex-col bg-background"
      style={{ "--shell-head-h": `${headH}px` } as CSSProperties}
    >
      <div
        ref={headRef}
        className="sticky top-0 z-20 bg-card/95 pt-[env(safe-area-inset-top)] backdrop-blur-md"
      >
        <header className="px-5 pb-3 pt-2" data-slot="app-header">
          <BrandMark size="compact" />
          {backHref ? (
            <Link
              href={backHref}
              className="type-meta mt-3 mb-1 inline-flex min-h-8 items-center font-semibold text-primary"
            >
              ← {backLabel}
            </Link>
          ) : null}
          {eyebrow ? (
            <p className={cn("type-eyebrow text-primary", !backHref && "mt-3")}>{eyebrow}</p>
          ) : null}
          <h1 className={cn("type-title text-foreground", !eyebrow && !backHref && "mt-2")}>{title}</h1>
        </header>
        {status}
      </div>
      <main className={cn("flex-1 px-4 pt-4", footer ? "pb-20" : hideNav ? "pb-10" : "pb-36")}>
        {children}
      </main>
      {footer ? (
        <div
          className={cn(
            "sticky z-20 bg-background/85 px-4 py-2 backdrop-blur-md",
            hideNav
              ? "bottom-0 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
              : "bottom-[calc(3.75rem+env(safe-area-inset-bottom))]",
          )}
        >
          {footer}
        </div>
      ) : null}
      {hideNav ? null : (
      <nav
        data-slot="app-tabs"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border/80 bg-card/95 pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] backdrop-blur-md"
      >
        <div className="mx-auto grid max-w-lg grid-cols-4 px-2 pt-1 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          {TABS.map((tab) => {
            const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
            const Icon = tab.icon;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "tap-target type-nav flex flex-col items-center justify-center gap-0.5 rounded-[var(--radius-button)]",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className="size-5" />
                {tab.label}
              </Link>
            );
          })}
        </div>
      </nav>
      )}
    </div>
  );
}
