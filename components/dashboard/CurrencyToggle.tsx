"use client";

import { Button } from "@/components/ui/button";
import { useCurrency } from "@/hooks/useCurrency";
import { cn } from "@/lib/utils";

export function CurrencyToggle() {
  const { currency, setCurrency } = useCurrency();

  return (
    <div className="flex items-center rounded-lg border border-slate-800 bg-slate-900 p-1">
      {(["USD", "PEN"] as const).map((code) => (
        <Button
          key={code}
          type="button"
          size="sm"
          variant={currency === code ? "default" : "ghost"}
          className={cn(
            "h-7 px-3 text-xs",
            currency === code ? "bg-primary text-primary-foreground" : "text-muted-foreground"
          )}
          onClick={() => setCurrency(code)}
        >
          {code}
        </Button>
      ))}
    </div>
  );
}
