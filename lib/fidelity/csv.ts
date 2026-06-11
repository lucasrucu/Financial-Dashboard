import { createHash } from "node:crypto";

import type { FidelityPortfolioPreview, FidelityPosition } from "@/types/fidelity";

export class FidelityCSVError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FidelityCSVError";
  }
}

export function hashFileBuffer(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

function parseAmount(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const cleaned = trimmed.replace(/[$+,]/g, "");
  const value = parseFloat(cleaned);
  return isNaN(value) ? null : value;
}

function parsePct(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const cleaned = trimmed.replace(/[%+,]/g, "");
  const value = parseFloat(cleaned);
  return isNaN(value) ? null : value;
}

function parseDownloadDate(text: string): string | null {
  // Matches "Date downloaded Jun-11-2026 4:07 a.m ET"
  const match = text.match(/Date downloaded\s+([A-Za-z]{3}-\d{1,2}-\d{4})/i);
  if (!match) return null;
  const parts = match[1].split("-");
  const parsed = new Date(`${parts[0]} ${parts[1]}, ${parts[2]}`);
  if (isNaN(parsed.getTime())) return null;
  const y = parsed.getFullYear();
  const m = String(parsed.getMonth() + 1).padStart(2, "0");
  const d = String(parsed.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function splitCsvLine(line: string): string[] {
  // Handles quoted fields (Fidelity footer disclaimers are fully quoted)
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

export function parseFidelityCSV(buffer: Buffer): FidelityPortfolioPreview {
  const fileHash = hashFileBuffer(buffer);
  const text = buffer.toString("utf-8");
  const lines = text.split(/\r?\n/);

  const warnings: string[] = [];
  const positions: FidelityPosition[] = [];

  let headerFound = false;
  let snapshotDate: string | null = null;
  let accountNumber = "";
  let accountName = "";

  // Column indices (resolved after header row is found)
  let colAccountNumber = 0;
  let colAccountName = 1;
  let colSymbol = 2;
  let colDescription = 3;
  let colQuantity = 4;
  let colLastPrice = 5;
  let colCurrentValue = 7;
  let colTodayGainDollar = 8;
  let colTodayGainPct = 9;
  let colTotalGainDollar = 10;
  let colTotalGainPct = 11;
  let colCostBasisTotal = 13;
  let colAvgCostBasis = 14;

  for (const line of lines) {
    const trimmed = line.trim();

    // Scan for download date in footer regardless of position
    if (!snapshotDate && trimmed.includes("Date downloaded")) {
      snapshotDate = parseDownloadDate(trimmed);
    }

    if (!trimmed || trimmed.startsWith('"')) continue;

    const cols = splitCsvLine(line);

    if (!headerFound) {
      if (cols[0].trim() === "Account Number") {
        headerFound = true;
        // Resolve column positions from header in case Fidelity ever reorders them
        const header = cols.map((c) => c.trim().toLowerCase());
        colAccountNumber = header.indexOf("account number");
        colAccountName = header.indexOf("account name");
        colSymbol = header.indexOf("symbol");
        colDescription = header.indexOf("description");
        colQuantity = header.indexOf("quantity");
        colLastPrice = header.indexOf("last price");
        colCurrentValue = header.indexOf("current value");
        colTodayGainDollar = header.indexOf("today's gain/loss dollar");
        colTodayGainPct = header.indexOf("today's gain/loss percent");
        colTotalGainDollar = header.indexOf("total gain/loss dollar");
        colTotalGainPct = header.indexOf("total gain/loss percent");
        colCostBasisTotal = header.indexOf("cost basis total");
        colAvgCostBasis = header.indexOf("average cost basis");
      }
      continue;
    }

    const symbol = cols[colSymbol]?.trim() ?? "";
    if (!symbol) continue;
    // Skip non-position rows like "Pending activity"
    if (/\s/.test(symbol)) continue;

    const rawCurrentValue = cols[colCurrentValue]?.trim() ?? "";
    const currentValueUsd = parseAmount(rawCurrentValue);
    if (currentValueUsd === null) continue;

    if (!accountNumber) {
      accountNumber = cols[colAccountNumber]?.trim() ?? "";
      accountName = cols[colAccountName]?.trim() ?? "";
    }

    const isMoneyMarket = symbol.includes("*");
    const quantity = isMoneyMarket ? null : parseAmount(cols[colQuantity]?.trim() ?? "");
    const priceUsd = isMoneyMarket ? null : parseAmount(cols[colLastPrice]?.trim() ?? "");

    positions.push({
      ticker: symbol,
      description: cols[colDescription]?.trim() ?? "",
      quantity,
      priceUsd,
      currentValueUsd,
      todayGainUsd: parseAmount(cols[colTodayGainDollar]?.trim() ?? ""),
      todayGainPct: parsePct(cols[colTodayGainPct]?.trim() ?? ""),
      totalGainUsd: parseAmount(cols[colTotalGainDollar]?.trim() ?? ""),
      totalGainPct: parsePct(cols[colTotalGainPct]?.trim() ?? ""),
      costBasisUsd: parseAmount(cols[colCostBasisTotal]?.trim() ?? ""),
      avgCostBasisUsd: parseAmount(cols[colAvgCostBasis]?.trim() ?? ""),
      isMoneyMarket,
    });
  }

  if (!headerFound) {
    throw new FidelityCSVError("Not a valid Fidelity portfolio CSV — header row not found.");
  }

  if (positions.length === 0) {
    throw new FidelityCSVError("No positions found in CSV.");
  }

  if (!snapshotDate) {
    // Fall back to today if the date line is missing
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    const d = String(today.getDate()).padStart(2, "0");
    snapshotDate = `${y}-${m}-${d}`;
    warnings.push("Download date not found in CSV — using today's date as snapshot date.");
  }

  const totalValueUsd = positions.reduce((sum, p) => sum + p.currentValueUsd, 0);
  const totalGainUsd = positions.every((p) => p.totalGainUsd !== null)
    ? positions.reduce((sum, p) => sum + (p.totalGainUsd ?? 0), 0)
    : null;

  return {
    snapshotDate,
    accountNumber,
    accountName,
    positions,
    totalValueUsd,
    totalGainUsd,
    fileHash,
    warnings,
  };
}
