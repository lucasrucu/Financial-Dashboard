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
import { PositionsTable } from "@/components/dashboard/PositionsTable";
import type { FidelityImportPayload, FidelityPortfolioPreview, FidelityStockPosition } from "@/types/fidelity";

interface ParseResponse {
  preview: FidelityPortfolioPreview;
  duplicate: boolean;
}

async function parseCSV(formData: FormData) {
  const response = await fetch("/api/fidelity/parse", {
    method: "POST",
    body: formData,
  });

  const payload = (await response.json()) as ParseResponse & { error?: string };

  if (!response.ok) {
    throw new Error(payload.error ?? "Failed to parse CSV");
  }

  return payload;
}

async function importPortfolio(payload: FidelityImportPayload) {
  const response = await fetch("/api/fidelity/import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = (await response.json()) as { imported?: number; error?: string };

  if (!response.ok) {
    throw new Error(data.error ?? "Failed to import portfolio");
  }

  return data;
}

function formatUsd(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);
}

function previewToTablePositions(positions: FidelityPortfolioPreview["positions"]): FidelityStockPosition[] {
  return positions.map((p, i) => ({
    id: String(i),
    user_id: "",
    snapshot_id: "",
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
}

interface FidelityPortfolioUploadProps {
  onImported?: () => void;
}

export function FidelityPortfolioUpload({ onImported }: FidelityPortfolioUploadProps) {
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<FidelityPortfolioPreview | null>(null);
  const [duplicate, setDuplicate] = useState(false);

  const parseMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile) throw new Error("Select a CSV file first");
      const formData = new FormData();
      formData.append("file", selectedFile);
      return parseCSV(formData);
    },
    onSuccess: (data) => {
      setPreview(data.preview);
      setDuplicate(data.duplicate);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to parse CSV");
    },
  });

  const importMutation = useMutation({
    mutationFn: (payload: FidelityImportPayload) => importPortfolio(payload),
    onSuccess: (result) => {
      toast.success(`Imported ${result.imported ?? 0} positions`);
      setPreview(null);
      setSelectedFile(null);
      setDuplicate(false);
      queryClient.invalidateQueries({ queryKey: ["portfolio"] });
      onImported?.();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to import portfolio");
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
      if (!preview) return;
      importMutation.mutate({
        fileHash: preview.fileHash,
        snapshotDate: preview.snapshotDate,
        accountNumber: preview.accountNumber,
        accountName: preview.accountName,
        positions: preview.positions,
        totalValueUsd: preview.totalValueUsd,
        force,
      });
    },
    [importMutation, preview]
  );

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle>Import Fidelity Portfolio</CardTitle>
        <CardDescription>
          Download your positions CSV from Fidelity (Positions page → Download) and upload it here.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => document.getElementById("fidelity-csv-file")?.click()}
            >
              <FileUp className="size-4" />
              Choose CSV
            </Button>
            <span className="max-w-[220px] truncate text-sm text-muted-foreground">
              {selectedFile ? selectedFile.name : "No file chosen"}
            </span>
          </div>
          <input
            id="fidelity-csv-file"
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

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
          Parse CSV
        </Button>

        {preview ? (
          <div className="space-y-4 rounded-lg border border-border p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="font-medium">
                  Preview: {preview.accountName || preview.accountNumber}
                </p>
                <p className="text-sm text-muted-foreground">
                  {preview.snapshotDate} · {preview.positions.length} positions
                </p>
                <p className="text-sm text-muted-foreground">
                  Total value {formatUsd(preview.totalValueUsd)}
                  {preview.totalGainUsd !== null
                    ? ` · Total gain ${formatUsd(preview.totalGainUsd)}`
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

            {preview.warnings.length > 0 ? (
              <div className="space-y-1 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">
                {preview.warnings.map((w) => (
                  <p key={w}>{w}</p>
                ))}
              </div>
            ) : null}

            <PositionsTable positions={previewToTablePositions(preview.positions)} />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
