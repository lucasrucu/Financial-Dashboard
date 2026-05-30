"use client";

import { useEffect } from "react";

import { hydrateThemeFromStore } from "@/stores/themeStore";

export function ThemeInitializer() {
  useEffect(() => {
    hydrateThemeFromStore();
  }, []);

  return null;
}
