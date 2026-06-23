"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CategoryLabel } from "@/components/dashboard/CategoryLabel";
import { DEMO_TRANSACTIONS } from "@/components/landing/demo/sampleData";

// Slim, presentational stand-in for the real TransactionTable (which fetches
// its own data via hooks). Same visual language, fed entirely from sample data.

const formatAmount = (value: number) => {
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(Math.abs(value));
  return value >= 0 ? `+${formatted}` : `-${formatted}`;
};

const formatDate = (iso: string) =>
  new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

export function DemoTransactions() {
  return (
    <div className="overflow-hidden rounded-md border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Category</TableHead>
            <TableHead className="hidden sm:table-cell">Source</TableHead>
            <TableHead className="text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {DEMO_TRANSACTIONS.map((tx) => (
            <TableRow key={tx.id}>
              <TableCell className="whitespace-nowrap text-muted-foreground">
                {formatDate(tx.date)}
              </TableCell>
              <TableCell className="font-medium">{tx.name}</TableCell>
              <TableCell>
                <CategoryLabel category={tx.category} />
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                <Badge variant={tx.source === "plaid" ? "secondary" : "outline"}>
                  {tx.source === "plaid" ? "Plaid" : "BCP"}
                </Badge>
              </TableCell>
              <TableCell
                className={`text-right tabular-nums font-medium ${
                  tx.amountUsd >= 0 ? "text-positive" : "text-foreground"
                }`}
              >
                {formatAmount(tx.amountUsd)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
