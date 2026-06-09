import { defaultTheme } from "./default";
import { midnightTheme } from "./midnight";
import { sovereignTheme } from "./sovereign";
import type { Theme } from "./types";

export const builtInThemes: Theme[] = [defaultTheme, midnightTheme, sovereignTheme];

export const defaultThemeId = sovereignTheme.id;

export function getBuiltInTheme(id: string): Theme | undefined {
  return builtInThemes.find((theme) => theme.id === id);
}

export { defaultTheme, midnightTheme, sovereignTheme };
export type { Theme, ThemeVariables, ThemeTokenKey } from "./types";
export {
  THEME_TOKEN_KEYS,
  isThemeVariables,
  parseThemeImport,
} from "./types";
