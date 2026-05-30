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
      if (!preview) {
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

  return (
    <Card className="border-slate-800 bg-slate-900/50">
      <CardHeader>
        <CardTitle>Import BCP Statement</CardTitle>
        <CardDescription>
          Upload your BCP Estado de Cuenta PDF to preview and import transactions in soles.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-[1fr_auto]">
          <div className="space-y-2">
            <Label htmlFor="bcp-statement-file">Statement PDF</Label>
            <Input
              id="bcp-statement-file"
              type="file"
              accept="application/pdf,.pdf"
              onChange={handleFileChange}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bcp-statement-password">PDF Password (optional)</Label>
            <Input
              id="bcp-statement-password"
              type="password"
              placeholder="Uses BCP_PDF_PASSWORD if empty"
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
          <div className="space-y-4 rounded-lg border border-slate-800 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="font-medium">Preview: {preview.accountCode}</p>
                <p className="text-sm text-muted-foreground">
                  {formatDate(preview.period.start)} to {formatDate(preview.period.end)} ·{" "}
                  {preview.transactions.length} transactions
                </p>
                <p className="text-sm text-muted-foreground">
                  Opening {formatPen(preview.openingBalancePen)}
                  {preview.closingBalancePen !== null
                    ? ` · Closing ${formatPen(preview.closingBalancePen)}`
                    : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={() => handleImport(false)}
                  disabled={importMutation.isPending || duplicate}
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
                    disabled={importMutation.isPending}
                  >
                    Re-import Anyway
                  </Button>
                ) : null}
              </div>
            </div>

            {preview.warnings.length ? (
              <div className="space-y-1 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">
                {preview.warnings.map((warning) => (
                  <p key={warning}>{warning}</p>
                ))}
              </div>
            ) : null}

            <div className="max-h-96 overflow-auto rounded-md border border-slate-800">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">PEN</TableHead>
                    <TableHead className="text-right">USD</TableHead>
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
                      <TableCell className="text-right">{formatPen(transaction.amountPen)}</TableCell>
                      <TableCell className="text-right">
                        {formatUsd(transaction.amountUsd)}
                      </TableCell>
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
