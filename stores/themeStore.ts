"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import { applyTheme } from "@/lib/applyTheme";
import {
  builtInThemes,
  defaultTheme,
  defaultThemeId,
  getBuiltInTheme,
} from "@/themes";
import type { Theme, ThemeVariables } from "@/themes/types";
import { parseThemeImport } from "@/themes/types";

interface ThemeState {
  selectedThemeId: string;
  customThemes: Theme[];
  setTheme: (themeId: string) => void;
  importTheme: (payload: unknown) => Theme;
  removeCustomTheme: (themeId: string) => void;
  resolveTheme: (themeId?: string) => Theme;
  getAllThemes: () => Theme[];
}

function createCustomThemeId(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `custom-${slug}-${Date.now()}`;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      selectedThemeId: defaultThemeId,
      customThemes: [],

      resolveTheme: (themeId) => {
        const id = themeId ?? get().selectedThemeId;
        const builtIn = getBuiltInTheme(id);
        if (builtIn) return builtIn;

        const custom = get().customThemes.find((theme) => theme.id === id);
        if (custom) return custom;

        return defaultTheme;
      },

      getAllThemes: () => [...builtInThemes, ...get().customThemes],

      setTheme: (themeId) => {
        const theme = get().resolveTheme(themeId);
        set({ selectedThemeId: theme.id });
        applyTheme(theme);
      },

      importTheme: (payload) => {
        const { name, variables } = parseThemeImport(payload);
        const theme: Theme = {
          id: createCustomThemeId(name),
          name,
          variables,
        };

        set((state) => ({
          customThemes: [...state.customThemes, theme],
          selectedThemeId: theme.id,
        }));
        applyTheme(theme);
        return theme;
      },

      removeCustomTheme: (themeId) => {
        set((state) => {
          const customThemes = state.customThemes.filter(
            (theme) => theme.id !== themeId
          );
          const selectedThemeId =
            state.selectedThemeId === themeId
              ? defaultThemeId
              : state.selectedThemeId;

          return { customThemes, selectedThemeId };
        });

        const theme = get().resolveTheme(get().selectedThemeId);
        applyTheme(theme);
      },
    }),
    {
      name: "financial-dashboard-theme",
      partialize: (state) => ({
        selectedThemeId: state.selectedThemeId,
        customThemes: state.customThemes,
      }),
    }
  )
);

export function hydrateThemeFromStore(): void {
  const { selectedThemeId, resolveTheme } = useThemeStore.getState();
  applyTheme(resolveTheme(selectedThemeId));
}

export type { ThemeVariables };
