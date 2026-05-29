"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { CurrencyCode } from "@/constants/currencies";

interface CurrencyState {
  currency: CurrencyCode;
  setCurrency: (currency: CurrencyCode) => void;
  toggleCurrency: () => void;
}

export const useCurrencyStore = create<CurrencyState>()(
  persist(
    (set, get) => ({
      currency: "USD",
      setCurrency: (currency) => set({ currency }),
      toggleCurrency: () =>
        set({ currency: get().currency === "USD" ? "PEN" : "USD" }),
    }),
    {
      name: "financial-dashboard-currency",
    }
  )
);
