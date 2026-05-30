"use client";

import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { ListFilter } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PANEL_WIDTH = 240;
const PANEL_GAP = 4;
const VIEWPORT_PADDING = 8;

interface ColumnFilterPopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isActive: boolean;
  align?: "start" | "end";
  children: ReactNode;
}

function computePosition(
  trigger: HTMLElement,
  align: "start" | "end"
): { top: number; left: number } {
  const rect = trigger.getBoundingClientRect();
  let left =
    align === "end"
      ? rect.right - PANEL_WIDTH
      : rect.left;

  left = Math.max(
    VIEWPORT_PADDING,
    Math.min(left, window.innerWidth - PANEL_WIDTH - VIEWPORT_PADDING)
  );

  let top = rect.bottom + PANEL_GAP;
  const panelHeightEstimate = 200;

  if (top + panelHeightEstimate > window.innerHeight - VIEWPORT_PADDING) {
    top = Math.max(VIEWPORT_PADDING, rect.top - panelHeightEstimate - PANEL_GAP);
  }

  return { top, left };
}

export function ColumnFilterPopover({
  open,
  onOpenChange,
  isActive,
  align = "start",
  children,
}: ColumnFilterPopoverProps) {
  const triggerRef = useRef<HTMLSpanElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(
    null
  );

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) {
      return;
    }

    setPosition(computePosition(trigger, align));
  }, [align]);

  useLayoutEffect(() => {
    if (!open) {
      setPosition(null);
      return;
    }

    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);

    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open, updatePosition]);

  return (
    <>
      <span ref={triggerRef} className="inline-flex shrink-0">
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label="Open column filter"
          aria-expanded={open}
          className={cn(
            isActive
              ? "text-primary hover:text-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
          onClick={() => onOpenChange(!open)}
        >
          <ListFilter className="size-3" />
        </Button>
      </span>

      {open && position && typeof document !== "undefined"
        ? createPortal(
            <>
              <button
                type="button"
                className="fixed inset-0 z-40 cursor-default"
                aria-label="Close filter menu"
                onClick={() => onOpenChange(false)}
              />
              <div
                className="fixed z-50 w-[240px] rounded-lg border border-border bg-popover p-3 shadow-lg"
                style={{ top: position.top, left: position.left }}
                onClick={(event) => event.stopPropagation()}
              >
                {children}
              </div>
            </>,
            document.body
          )
        : null}
    </>
  );
}
