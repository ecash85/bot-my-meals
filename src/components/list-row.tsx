import { Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

export function ListRow({
  name,
  quantity,
  checked,
  syncing = false,
  onCheckedChange,
}: {
  name: string;
  quantity: string;
  checked: boolean;
  syncing?: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <li data-slot="list-row" aria-busy={syncing || undefined} className="flex min-h-12 items-center gap-3 px-1">
      <span className="relative shrink-0">
        <Checkbox
          checked={checked}
          className="size-5 data-checked:border-approve data-checked:bg-approve data-checked:text-approve-foreground"
          onCheckedChange={(value) => onCheckedChange(value === true)}
          aria-label={`Got ${name}`}
        />
        <Loader2
          aria-hidden
          data-slot="list-row-sync"
          className={cn(
            "pointer-events-none absolute -top-1 -right-1 size-3 animate-spin text-muted-foreground transition-opacity duration-150",
            syncing ? "opacity-100 delay-[400ms]" : "opacity-0",
          )}
        />
      </span>
      <span className={cn("type-body flex-1", checked && "text-muted-foreground line-through")}>
        {name}
      </span>
      <span className="type-meta font-mono text-muted-foreground">{quantity}</span>
    </li>
  );
}
