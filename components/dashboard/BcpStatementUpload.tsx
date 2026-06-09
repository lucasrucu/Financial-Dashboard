"use client";

import { useCallback, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FileUp, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getCategoryById, useCategories } from "@/hooks/useCategories";
import { formatDate } from "@/lib/utils";
import type { BcpImportPayload, BcpImportPreview } from "@/types/bcp";

interface ParseResponse {
  preview: BcpImportPreview;
  duplicate: boolean;
}

async function parseStatement(formData: FormData) {
  const response = await fetch("/api/bcp/parse", {
    method: "POST",
    body: formData,
  });

  const payload = (await response.json()) as ParseResponse & { error?: string };

  if (!response.ok) {
    throw new Error(payload.error ?? "Failed to parse statement");
  }

  return payload;
}

async function importStatement(payload: BcpImportPayload) {
  const response = await fetch("/api/bcp/import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = (await response.json()) as {
    imported?: number;
    skipped?: number;
    error?: string;
  };

  if (!response.ok) {
    throw new Error(data.error ?? "Failed to import statement");
  }

  return data;
}

function formatPen(amount: number) {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatUsd(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(amount);
}

function getCategoryLabel(categoryId: string, categories: ReturnType<typeof useCategories>["data"]) {
  return getCategoryById(categories, categoryId)?.label ?? categoryId;
}

function canImportPreview(preview: BcpImportPreview): boolean {
  return Boolean(
    preview.fileHash &&
      preview.accountCode &&
      preview.period.start &&
      preview.period.end &&
      preview.transactions.length > 0
  );
}

function isUsdStatement(preview: BcpImportPreview): boolean {
  return preview.currency.toUpperCase() === "USD";
}

function formatStatementBalance(amount: number, preview: BcpImportPreview): string {
  return isUsdStatement(preview) ? formatUsd(amount) : formatPen(amount);
}

function getImportBlockReason(preview: BcpImportPreview): string | null {
  if (!preview.accountCode) {
    return "Import blocked: account code could not be detected from the statement.";
  }

  if (!preview.period.start || !preview.period.end) {
    return "Import blocked: statement period could not be detected from the header.";
  }

  if (preview.transactions.length === 0) {
    return "Import blocked: no transactions were parsed from this statement.";
  }

  return null;
}

export function BcpStatementUpload() {
  const queryClient = useQueryClient();
  const { data: categories } = useCategories();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [preview, setPreview] = useState<BcpImportPreview | null>(null);
  const [duplicate, setDuplicate] = useState(false);

  const parseMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile) {
        throw new Error("Select a PDF statement first");
      }

      const formData = new FormData();
      formData.append("file", selectedFile);

      if (password.trim()) {
        formData.append("password", password.trim());
      }

      return parseStatement(formData);
    },
    onSuccess: (data) => {
      setPreview(data.preview);
      setDuplicate(data.duplicate);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to parse statement");
    },
  });

  const importMutation = useMutation({
    mutationFn: (payload: BcpImportPayload) => importStatement(payload),
    onSuccess: (result) => {
      toast.success(`Imported ${result.imported ?? 0} BCP transactions`);
      setPreview(null);
      setSelectedFile(null);
      setDuplicate(false);
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["overview"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to import statement");
    },
  });

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
    setPreview(null);
    setDuplicate(false);
  }, []);

  const handleImport = useCallback(
    (force = false) => {
      if (!preview || !canImportPreview(preview)) {
        return;
      }

      importMutation.mutate({
        fileHash: preview.fileHash,
        accountCode: preview.accountCode,
        currency: preview.currency,
        period: preview.period,
        openingBalancePen: preview.openingBalancePen,
        closingBalancePen: preview.closingBalancePen,
        transactions: preview.transactions.map((transaction) => ({
          date: transaction.date,
          description: transaction.description,
          amountPen: transaction.amountPen,
          amountUsd: transaction.amountUsd,
          type: transaction.type,
          categoryId: transaction.categoryId,
        })),
        force,
      });
    },
    [importMutation, preview]
  );

  const canImport = preview ? canImportPreview(preview) : false;
  const importBlockReason = preview ? getImportBlockReason(preview) : null;

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle>Import BCP Statement</CardTitle>
        <CardDescription>
          Upload your BCP Estado de Cuenta PDF to preview and import transactions from soles or
          USD accounts.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-[1fr_auto]">
          <div className="space-y-2">
            <Label>Statement PDF</Label>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById("bcp-statement-file")?.click()}
              >
                <FileUp className="size-4" />
                Choose PDF
              </Button>
              <span className="max-w-[200px] truncate text-sm text-muted-foreground">
                {selectedFile ? selectedFile.name : "No file chosen"}
              </span>
            </div>
            <input
              id="bcp-statement-file"
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bcp-statement-password">PDF Password (optional)</Label>
            <Input
              id="bcp-statement-password"
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="Optional"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={() => parseMutation.mutate()}
            disabled={!selectedFile || parseMutation.isPending}
          >
            {parseMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Upload className="size-4" />
            )}
            Parse Statement
          </Button>
        </div>

        {preview ? (
          <div className="space-y-4 rounded-lg border border-border p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="font-medium">
                  Preview: {preview.accountCode || "Account code not detected"}
                  {preview.accountCode
                    ? ` · ${isUsdStatement(preview) ? "USD" : "Soles"}`
                    : ""}
                </p>
                <p className="text-sm text-muted-foreground">
                  {formatDate(preview.period.start)} to {formatDate(preview.period.end)} ·{" "}
                  {preview.transactions.length} transactions
                </p>
                <p className="text-sm text-muted-foreground">
                  Opening {formatStatementBalance(preview.openingBalancePen, preview)}
                  {preview.closingBalancePen !== null
                    ? ` · Closing ${formatStatementBalance(preview.closingBalancePen, preview)}`
                    : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={() => handleImport(false)}
                  disabled={importMutation.isPending || duplicate || !canImport}
                >
                  {importMutation.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <FileUp className="size-4" />
                  )}
                  Confirm Import
                </Button>
                {duplicate ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleImport(true)}
                    disabled={importMutation.isPending || !canImport}
                  >
                    Re-import Anyway
                  </Button>
                ) : null}
              </div>
            </div>

            {importBlockReason ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {importBlockReason}
              </div>
            ) : null}

            {preview.warnings.length ? (
              <div className="space-y-1 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">
                {preview.warnings.map((warning) => (
                  <p key={warning}>{warning}</p>
                ))}
              </div>
            ) : null}

            <div className="max-h-96 overflow-auto rounded-md border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Category</TableHead>
                    {isUsdStatement(preview) ? (
                      <TableHead className="text-right">USD</TableHead>
                    ) : (
                      <>
                        <TableHead className="text-right">PEN</TableHead>
                        <TableHead className="text-right">USD</TableHead>
                      </>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.transactions.map((transaction) => (
                    <TableRow
                      key={`${transaction.date}-${transaction.description}-${transaction.amountPen}-${transaction.type}`}
                    >
                      <TableCell>{formatDate(transaction.date)}</TableCell>
                      <TableCell className="max-w-xs truncate">{transaction.description}</TableCell>
                      <TableCell>
                        <Badge variant={transaction.type === "credit" ? "default" : "secondary"}>
                          {transaction.type === "credit" ? "Income" : "Expense"}
                        </Badge>
                      </TableCell>
                      <TableCell>{getCategoryLabel(transaction.categoryId, categories)}</TableCell>
                      {isUsdStatement(preview) ? (
                        <TableCell className="text-right">
                          {formatUsd(transaction.amountUsd)}
                        </TableCell>
                      ) : (
                        <>
                          <TableCell className="text-right">
                            {formatPen(transaction.amountPen)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatUsd(transaction.amountUsd)}
                          </TableCell>
                        </>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
