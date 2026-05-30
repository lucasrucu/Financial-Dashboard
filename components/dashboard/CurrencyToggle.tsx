"use client";

import { Button } from "@/components/ui/button";
import { useCurrency } from "@/hooks/useCurrency";
import { cn } from "@/lib/utils";

export function CurrencyToggle() {
  const { currency, setCurrency } = useCurrency();

  return (
    <div className="inline-flex items-center gap-0.5 rounded-lg border border-border bg-card p-0.5">
      {(["USD", "PEN"] as const).map((code) => (
        <Button
          key={code}
          type="button"
          size="sm"
          variant="ghost"
          className={cn(
            "h-7 rounded-md px-3 text-xs shadow-none",
            currency === code
              ? "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
              : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
          )}
          onClick={() => setCurrency(code)}
        >
          {code}
        </Button>
      ))}
    </div>
  );
}
