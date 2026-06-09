"use client";

import { Check, Palette } from "lucide-react";

import { cn } from "@/lib/utils";
import { useThemeStore } from "@/stores/themeStore";
import type { Theme } from "@/themes/types";

function ThemeSwatches({ theme }: { theme: Theme }) {
  const swatchKeys = ["primary", "background", "card"] as const;

  return (
    <div className="flex items-center gap-1">
      {swatchKeys.map((key) => (
        <span
          key={key}
          className="size-2.5 rounded-full ring-1 ring-border"
          style={{ backgroundColor: `hsl(${theme.variables[key]})` }}
          aria-hidden
        />
      ))}
    </div>
  );
}

export function ThemePicker() {
  const selectedThemeId = useThemeStore((state) => state.selectedThemeId);
  const setTheme = useThemeStore((state) => state.setTheme);
  const getAllThemes = useThemeStore((state) => state.getAllThemes);

  const themes = getAllThemes();

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <Palette className="size-3.5" />
        Theme
      </div>

      <ul className="space-y-1">
        {themes.map((theme) => {
          const isSelected = theme.id === selectedThemeId;

          return (
            <li key={theme.id}>
              <button
                type="button"
                onClick={() => setTheme(theme.id)}
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                  isSelected
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
                )}
              >
                <span className="truncate">{theme.name}</span>
                <span className="flex shrink-0 items-center gap-2">
                  <ThemeSwatches theme={theme} />
                  {isSelected ? <Check className="size-3.5" /> : null}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
