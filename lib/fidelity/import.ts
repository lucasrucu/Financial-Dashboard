import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  FidelityImportPayload,
  FidelityPortfolioPreview,
  FidelitySnapshot,
} from "@/types/fidelity";

export async function checkDuplicateSnapshot(
  supabase: SupabaseClient,
  fileHash: string
): Promise<FidelitySnapshot | null> {
  const { data } = await supabase
    .from("portfolio_snapshots")
    .select("*")
    .eq("file_hash", fileHash)
    .maybeSingle();

  return (data as FidelitySnapshot | null) ?? null;
}

export async function importFidelityPortfolio(
  supabase: SupabaseClient,
  userId: string,
  payload: FidelityImportPayload
): Promise<{ snapshotId: string; imported: number }> {
  if (!payload.force) {
    const existing = await checkDuplicateSnapshot(supabase, payload.fileHash);
    if (existing) {
      throw new Error(`This portfolio snapshot was already imported on ${existing.imported_at}`);
    }
  } else {
    // Delete the old snapshot (positions cascade)
    await supabase
      .from("portfolio_snapshots")
      .delete()
      .eq("file_hash", payload.fileHash)
      .eq("user_id", userId);
  }

  const { data: snapshot, error: snapshotError } = await supabase
    .from("portfolio_snapshots")
    .insert({
      user_id: userId,
      snapshot_date: payload.snapshotDate,
      file_hash: payload.fileHash,
      position_count: payload.positions.length,
      total_value_usd: payload.totalValueUsd,
    })
    .select("id")
    .single();

  if (snapshotError || !snapshot) {
    throw new Error(snapshotError?.message ?? "Failed to create portfolio snapshot");
  }

  const rows = payload.positions.map((p) => ({
    user_id: userId,
    snapshot_id: snapshot.id,
    ticker: p.ticker,
    description: p.description || null,
    quantity: p.quantity,
    price_usd: p.priceUsd,
    current_value_usd: p.currentValueUsd,
    today_gain_usd: p.todayGainUsd,
    today_gain_pct: p.todayGainPct,
    total_gain_usd: p.totalGainUsd,
    total_gain_pct: p.totalGainPct,
    cost_basis_usd: p.costBasisUsd,
    avg_cost_basis_usd: p.avgCostBasisUsd,
    is_money_market: p.isMoneyMarket,
  }));

  const { error: positionsError } = await supabase.from("stock_positions").insert(rows);

  if (positionsError) {
    // Roll back the snapshot
    await supabase.from("portfolio_snapshots").delete().eq("id", snapshot.id);
    throw new Error(positionsError.message ?? "Failed to insert positions");
  }

  return { snapshotId: snapshot.id, imported: rows.length };
}

export function buildImportPayload(
  preview: FidelityPortfolioPreview,
  force = false
): FidelityImportPayload {
  return {
    fileHash: preview.fileHash,
    snapshotDate: preview.snapshotDate,
    accountNumber: preview.accountNumber,
    accountName: preview.accountName,
    positions: preview.positions,
    totalValueUsd: preview.totalValueUsd,
    force,
  };
}
