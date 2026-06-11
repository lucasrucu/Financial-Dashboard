"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { FidelityStockPosition } from "@/types/fidelity";

interface PositionsTableProps {
  positions: FidelityStockPosition[];
}

function formatUsd(value: number | null): string {
  if (value === null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPct(value: number | null): string {
  if (value === null) return "";
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

function formatQuantity(value: number | null): string {
  if (value === null) return "—";
  return value.toLocaleString("en-US", { maximumFractionDigits: 4 });
}

function gainClass(value: number | null): string {
  if (value === null) return "";
  return value >= 0 ? "text-green-500" : "text-red-500";
}

export function PositionsTable({ positions }: PositionsTableProps) {
  return (
    <>
      {/* ── Mobile: card-per-position ── */}
      <div className="space-y-2 md:hidden">
        {positions.map((position) => (
          <div
            key={position.id}
            className="flex items-start justify-between rounded-lg border border-border bg-card px-4 py-3"
          >
            <div className="min-w-0 pr-3">
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-semibold">{position.ticker}</span>
                {position.is_money_market ? (
                  <span className="text-xs text-muted-foreground">cash</span>
                ) : null}
              </div>
              {position.description ? (
                <p className="mt-0.5 max-w-[180px] truncate text-xs text-muted-foreground">
                  {position.description}
                </p>
              ) : null}
              {position.quantity !== null ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatQuantity(position.quantity)} shares @ {formatUsd(position.price_usd)}
                </p>
              ) : null}
            </div>

            <div className="shrink-0 text-right">
              <p className="tabular-nums font-medium">{formatUsd(position.current_value_usd)}</p>
              {position.total_gain_usd !== null ? (
                <p className={`mt-0.5 text-xs tabular-nums ${gainClass(position.total_gain_usd)}`}>
                  {formatUsd(position.total_gain_usd)}
                  {position.total_gain_pct !== null ? (
                    <span className="ml-1 opacity-80">({formatPct(position.total_gain_pct)})</span>
                  ) : null}
                </p>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      {/* ── Desktop: full table ── */}
      <div className="hidden overflow-auto rounded-md border border-border md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Symbol</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">Value</TableHead>
              <TableHead className="text-right hidden lg:table-cell">Cost Basis</TableHead>
              <TableHead className="text-right">Total Gain</TableHead>
              <TableHead className="text-right hidden lg:table-cell">Gain %</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {positions.map((position) => (
              <TableRow key={position.id}>
                <TableCell className="font-mono font-medium">
                  {position.ticker}
                  {position.is_money_market ? (
                    <span className="ml-1.5 text-xs text-muted-foreground">cash</span>
                  ) : null}
                </TableCell>
                <TableCell className="max-w-[200px] truncate text-muted-foreground text-sm">
                  {position.description ?? "—"}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatQuantity(position.quantity)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatUsd(position.price_usd)}
                </TableCell>
                <TableCell className="text-right tabular-nums font-medium">
                  {formatUsd(position.current_value_usd)}
                </TableCell>
                <TableCell className="text-right tabular-nums hidden lg:table-cell text-muted-foreground">
                  {formatUsd(position.cost_basis_usd)}
                </TableCell>
                <TableCell className={`text-right tabular-nums ${gainClass(position.total_gain_usd)}`}>
                  {formatUsd(position.total_gain_usd)}
                </TableCell>
                <TableCell className={`text-right tabular-nums hidden lg:table-cell ${gainClass(position.total_gain_pct)}`}>
                  {formatPct(position.total_gain_pct)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
