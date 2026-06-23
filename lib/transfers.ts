import { EXCLUDED_FROM_TOTALS_CATEGORY_IDS } from "@/constants/categories";

// Detects likely internal transfers between the user's OWN accounts. Pairs an
// outflow in one account with an inflow in another within a short time window,
// matching by amount with a tolerance band so fees and FX spreads (e.g. PEN→USD)
// don't break the match. Exact-amount matching is deliberately avoided.

export interface TransferLeg {
  id: string;
  date: string; // yyyy-mm-dd
  name: string;
  amount_usd: number; // signed: >0 outflow, <0 inflow
  account_id: string;
  account_name: string;
  category_id: string;
  plaid_category: string[] | null;
}

export interface TransferCandidatePair {
  outflow: TransferLeg;
  inflow: TransferLeg;
  amountUsd: number; // larger magnitude of the two legs (amount sent)
  deltaUsd: number; // |outflow| - |inflow|, i.e. the fee / FX gap
  daysApart: number;
}

interface FindOptions {
  windowDays?: number;
  tolerance?: number; // min(|a|,|b|) / max(|a|,|b|) must be >= this
}

function daysBetween(a: string, b: string): number {
  const ms = Math.abs(new Date(`${a}T00:00:00Z`).getTime() - new Date(`${b}T00:00:00Z`).getTime());
  return Math.round(ms / (24 * 60 * 60 * 1000));
}

function looksLikeTransfer(plaidCategory: string[] | null): boolean {
  return (plaidCategory ?? []).some((c) => c.toUpperCase().includes("TRANSFER"));
}

export function findTransferCandidates(
  transactions: TransferLeg[],
  { windowDays = 4, tolerance = 0.9 }: FindOptions = {}
): TransferCandidatePair[] {
  const eligible = transactions.filter(
    (t) => !EXCLUDED_FROM_TOTALS_CATEGORY_IDS.has(t.category_id)
  );

  const outflows = eligible
    .filter((t) => t.amount_usd > 0)
    .sort((a, b) => b.date.localeCompare(a.date));
  const inflows = eligible.filter((t) => t.amount_usd < 0);

  const usedInflow = new Set<string>();
  const pairs: TransferCandidatePair[] = [];

  for (const outflow of outflows) {
    const out = Math.abs(outflow.amount_usd);
    let best: { inflow: TransferLeg; score: number; days: number } | null = null;

    for (const inflow of inflows) {
      if (usedInflow.has(inflow.id)) continue;
      if (inflow.account_id === outflow.account_id) continue; // must cross accounts

      const days = daysBetween(outflow.date, inflow.date);
      if (days > windowDays) continue;

      const inAbs = Math.abs(inflow.amount_usd);
      const ratio = Math.min(out, inAbs) / Math.max(out, inAbs);
      if (ratio < tolerance) continue;

      // Prefer closer amounts, then closer dates, then a Plaid transfer hint.
      const score = ratio + (looksLikeTransfer(inflow.plaid_category) ? 0.01 : 0) - days * 0.001;
      if (!best || score > best.score) {
        best = { inflow, score, days };
      }
    }

    if (best) {
      usedInflow.add(best.inflow.id);
      const inAbs = Math.abs(best.inflow.amount_usd);
      pairs.push({
        outflow,
        inflow: best.inflow,
        amountUsd: Math.max(out, inAbs),
        deltaUsd: Number((out - inAbs).toFixed(2)),
        daysApart: best.days,
      });
    }
  }

  return pairs.sort((a, b) => b.outflow.date.localeCompare(a.outflow.date));
}
