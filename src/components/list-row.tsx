import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

export function ListRow({
  name,
  quantity,
  checked,
  onCheckedChange,
}: {
  name: string;
  quantity: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <li data-slot="list-row" className="flex min-h-12 items-center gap-3 px-1">
      <Checkbox
        checked={checked}
        className="size-5 data-checked:border-approve data-checked:bg-approve data-checked:text-approve-foreground"
        onCheckedChange={(value) => onCheckedChange(value === true)}
        aria-label={`Got ${name}`}
      />
      <span className={cn("type-body flex-1", checked && "text-muted-foreground line-through")}>
        {name}
      </span>
      <span className="type-meta font-mono text-muted-foreground">{quantity}</span>
    </li>
  );
}
