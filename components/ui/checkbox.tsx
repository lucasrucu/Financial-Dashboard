"use client";

import * as React from "react";
import { CheckIcon, MinusIcon } from "lucide-react";

import { cn } from "@/lib/utils";

function Checkbox({
  className,
  checked,
  indeterminate,
  disabled,
  onChange,
  ...props
}: React.ComponentProps<"input"> & { indeterminate?: boolean }) {
  const ref = React.useRef<HTMLInputElement>(null);
  const isActive = checked || indeterminate;

  React.useEffect(() => {
    if (ref.current) {
      ref.current.indeterminate = indeterminate ?? false;
    }
  }, [indeterminate]);

  return (
    <label
      className={cn(
        "group/checkbox relative inline-flex size-4 shrink-0 cursor-pointer items-center justify-center",
        disabled && "cursor-not-allowed opacity-50"
      )}
    >
      <input
        ref={ref}
        type="checkbox"
        role="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        className="peer sr-only"
        {...props}
      />
      <span
        className={cn(
          "flex size-4 items-center justify-center rounded-md border border-input bg-transparent transition-colors",
          "peer-focus-visible:border-ring peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50",
          "peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
          !disabled && "group-hover/checkbox:border-primary/40 group-hover/checkbox:bg-muted/50",
          isActive && "border-primary bg-primary text-primary-foreground",
          className
        )}
        aria-hidden
      >
        {indeterminate ? (
          <MinusIcon className="size-3" />
        ) : (
          <CheckIcon className={cn("size-3", checked ? "opacity-100" : "opacity-0")} />
        )}
      </span>
    </label>
  );
}

export { Checkbox };
