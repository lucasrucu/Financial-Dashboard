import type { Theme } from "@/themes/types";

export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  root.dataset.theme = theme.id;

  for (const [key, value] of Object.entries(theme.variables)) {
    root.style.setProperty(`--${key}`, value);
  }
}

export function getThemeCssVar(name: string): string {
  if (typeof window === "undefined") {
    return `hsl(var(--${name}))`;
  }

  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(`--${name}`)
    .trim();

  return value ? `hsl(${value})` : `hsl(var(--${name}))`;
}
