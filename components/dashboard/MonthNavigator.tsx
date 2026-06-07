"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatMonthLabel } from "@/lib/overview";

interface MonthNavigatorProps {
  monthOffset: number;
  onMonthOffsetChange: (offset: number) => void;
}

export function MonthNavigator({ monthOffset, onMonthOffsetChange }: MonthNavigatorProps) {
  return (
    <div className="flex items-center justify-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        aria-label="Previous month"
        onClick={() => onMonthOffsetChange(monthOffset - 1)}
      >
        <ChevronLeft className="size-4" />
      </Button>
      <span className="min-w-36 text-center text-sm font-medium">
        {formatMonthLabel(monthOffset)}
      </span>
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        aria-label="Next month"
        disabled={monthOffset >= 0}
        onClick={() => onMonthOffsetChange(monthOffset + 1)}
      >
        <ChevronRight className="size-4" />
      </Button>
    </div>
  );
}
