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
  if (value === null) return "—";
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
    <div className="overflow-auto rounded-md border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Symbol</TableHead>
            <TableHead className="hidden sm:table-cell">Description</TableHead>
            <TableHead className="text-right">Qty</TableHead>
            <TableHead className="text-right">Price</TableHead>
            <TableHead className="text-right">Value</TableHead>
            <TableHead className="text-right hidden md:table-cell">Cost Basis</TableHead>
            <TableHead className="text-right">Total Gain</TableHead>
            <TableHead className="text-right hidden md:table-cell">Gain %</TableHead>
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
              <TableCell className="hidden sm:table-cell max-w-[200px] truncate text-muted-foreground text-sm">
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
              <TableCell className="text-right tabular-nums hidden md:table-cell text-muted-foreground">
                {formatUsd(position.cost_basis_usd)}
              </TableCell>
              <TableCell className={`text-right tabular-nums ${gainClass(position.total_gain_usd)}`}>
                {formatUsd(position.total_gain_usd)}
              </TableCell>
              <TableCell className={`text-right tabular-nums hidden md:table-cell ${gainClass(position.total_gain_pct)}`}>
                {formatPct(position.total_gain_pct)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
