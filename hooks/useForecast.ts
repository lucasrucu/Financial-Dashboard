"use client";

import { useQuery } from "@tanstack/react-query";

import type { ForecastData } from "@/types/forecast";

async function fetchForecast() {
  const response = await fetch("/api/forecast");

  if (!response.ok) {
    throw new Error("Failed to fetch forecast");
  }

  return response.json() as Promise<ForecastData>;
}

export function useForecast() {
  return useQuery({
    queryKey: ["forecast"],
    queryFn: fetchForecast,
  });
}
