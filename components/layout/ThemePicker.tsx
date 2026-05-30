"use client";

import { Check, Palette, Trash2, Upload } from "lucide-react";
import { useRef } from "react";

import { Button } from "@/components/ui/button";
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectedThemeId = useThemeStore((state) => state.selectedThemeId);
  const customThemes = useThemeStore((state) => state.customThemes);
  const setTheme = useThemeStore((state) => state.setTheme);
  const importTheme = useThemeStore((state) => state.importTheme);
  const removeCustomTheme = useThemeStore((state) => state.removeCustomTheme);
  const getAllThemes = useThemeStore((state) => state.getAllThemes);

  const themes = getAllThemes();

  async function handleImportFile(file: File) {
    try {
      const text = await file.text();
      const payload = JSON.parse(text) as unknown;
      importTheme(payload);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not import theme file.";
      window.alert(message);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <Palette className="size-3.5" />
        Theme
      </div>

      <ul className="space-y-1">
        {themes.map((theme) => {
          const isSelected = theme.id === selectedThemeId;
          const isCustom = customThemes.some((item) => item.id === theme.id);

          return (
            <li key={theme.id}>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setTheme(theme.id)}
                  className={cn(
                    "flex min-w-0 flex-1 items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors",
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

                {isCustom ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                    aria-label={`Remove ${theme.name} theme`}
                    onClick={() => removeCustomTheme(theme.id)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>

      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            void handleImportFile(file);
          }
          event.target.value = "";
        }}
      />

      <Button
        type="button"
        variant="ghost"
        className="w-full justify-start gap-2 px-3 text-muted-foreground hover:text-foreground"
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="size-4 shrink-0" />
        Import theme…
      </Button>
    </div>
  );
}
