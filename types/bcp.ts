import type { SpendingCategoryId } from "@/constants/categories";

export interface BcpStatementPeriod {
  start: string;
  end: string;
}

export interface BcpParsedTransaction {
  date: string;
  description: string;
  amountPen: number;
  type: "debit" | "credit";
  categoryId: SpendingCategoryId;
}

export interface BcpParsedStatement {
  accountCode: string;
  currency: string;
  period: BcpStatementPeriod;
  openingBalancePen: number;
  closingBalancePen: number | null;
  totalDebitsPen: number | null;
  totalCreditsPen: number | null;
  transactions: BcpParsedTransaction[];
  warnings: string[];
}

export interface BcpPreviewTransaction extends BcpParsedTransaction {
  amountUsd: number;
  usdToPen: number;
}

export interface BcpImportPreview {
  accountCode: string;
  currency: string;
  period: BcpStatementPeriod;
  openingBalancePen: number;
  closingBalancePen: number | null;
  totalDebitsPen: number | null;
  totalCreditsPen: number | null;
  transactions: BcpPreviewTransaction[];
  warnings: string[];
  fileHash: string;
}

export interface BcpImportPayload {
  fileHash: string;
  accountCode: string;
  currency: string;
  period: BcpStatementPeriod;
  openingBalancePen: number;
  closingBalancePen: number | null;
  transactions: Array<{
    date: string;
    description: string;
    amountPen: number;
    amountUsd: number;
    type: "debit" | "credit";
    categoryId: SpendingCategoryId;
  }>;
  force?: boolean;
}
