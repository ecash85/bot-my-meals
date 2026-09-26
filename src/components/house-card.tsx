import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function HouseCard({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLElement> & {
  children: ReactNode;
}) {
  return (
    <section
      data-slot="house-card"
      className={cn("rounded-[14px] bg-card p-5 shadow-card", className)}
      {...props}
    >
      {children}
    </section>
  );
}
