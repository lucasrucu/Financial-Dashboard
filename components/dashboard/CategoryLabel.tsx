import { cn } from "@/lib/utils";
import type { Category } from "@/types/category";

interface CategoryLabelProps {
  category: Pick<Category, "icon" | "color" | "label">;
  className?: string;
}

export function CategoryLabel({ category, className }: CategoryLabelProps) {
  return (
    <span className={cn("flex min-w-0 items-center gap-1.5", className)}>
      <span
        className="size-2 shrink-0 rounded-full"
        style={{ backgroundColor: category.color }}
        aria-hidden
      />
      <span className="shrink-0 text-base leading-none">{category.icon}</span>
      <span className="truncate">{category.label}</span>
    </span>
  );
}
