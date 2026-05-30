export const THEME_TOKEN_KEYS = [
  "background",
  "foreground",
  "card",
  "card-foreground",
  "popover",
  "popover-foreground",
  "primary",
  "primary-foreground",
  "secondary",
  "secondary-foreground",
  "muted",
  "muted-foreground",
  "accent",
  "accent-foreground",
  "destructive",
  "destructive-foreground",
  "border",
  "input",
  "ring",
  "positive",
  "negative",
  "sidebar",
  "sidebar-foreground",
  "sidebar-primary",
  "sidebar-primary-foreground",
  "sidebar-accent",
  "sidebar-accent-foreground",
  "sidebar-border",
  "sidebar-ring",
] as const;

export type ThemeTokenKey = (typeof THEME_TOKEN_KEYS)[number];
export type ThemeVariables = Record<ThemeTokenKey, string>;

export interface Theme {
  id: string;
  name: string;
  variables: ThemeVariables;
}

export interface ThemeImportPayload {
  name: string;
  variables: Partial<ThemeVariables>;
}

export function isThemeVariables(
  value: unknown
): value is ThemeVariables {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return THEME_TOKEN_KEYS.every(
    (key) => typeof record[key] === "string" && record[key]!.length > 0
  );
}

export function parseThemeImport(
  payload: unknown
): { name: string; variables: ThemeVariables } {
  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid theme file: expected a JSON object.");
  }

  const data = payload as ThemeImportPayload;
  if (!data.name?.trim()) {
    throw new Error("Invalid theme file: missing name.");
  }
  if (!isThemeVariables(data.variables)) {
    throw new Error(
      "Invalid theme file: variables must include all required color tokens."
    );
  }

  return { name: data.name.trim(), variables: data.variables };
}
