export interface FidelityPosition {
  ticker: string;
  description: string;
  quantity: number | null;
  priceUsd: number | null;
  currentValueUsd: number;
  todayGainUsd: number | null;
  todayGainPct: number | null;
  totalGainUsd: number | null;
  totalGainPct: number | null;
  costBasisUsd: number | null;
  avgCostBasisUsd: number | null;
  isMoneyMarket: boolean;
}

export interface FidelityPortfolioPreview {
  snapshotDate: string;
  accountNumber: string;
  accountName: string;
  positions: FidelityPosition[];
  totalValueUsd: number;
  totalGainUsd: number | null;
  fileHash: string;
  warnings: string[];
}

export interface FidelityImportPayload {
  fileHash: string;
  snapshotDate: string;
  accountNumber: string;
  accountName: string;
  positions: FidelityPosition[];
  totalValueUsd: number;
  force?: boolean;
}

export interface FidelitySnapshot {
  id: string;
  user_id: string;
  snapshot_date: string;
  file_hash: string;
  position_count: number;
  total_value_usd: number;
  imported_at: string;
}

export interface FidelityStockPosition {
  id: string;
  user_id: string;
  snapshot_id: string;
  ticker: string;
  description: string | null;
  quantity: number | null;
  price_usd: number | null;
  current_value_usd: number;
  today_gain_usd: number | null;
  today_gain_pct: number | null;
  total_gain_usd: number | null;
  total_gain_pct: number | null;
  cost_basis_usd: number | null;
  avg_cost_basis_usd: number | null;
  is_money_market: boolean;
}

export interface FidelityPortfolioData {
  snapshot: FidelitySnapshot;
  positions: FidelityStockPosition[];
}
