import { detectRecurringTransactions } from "@/lib/aggregates";
import { mapBcpCategory } from "@/lib/bcp/categories";
import {
  buildBcpTransactionId,
  parseBcpStatement,
  toPlaidSignedAmount,
} from "@/lib/bcp/parser";
import { extractBcpPdfText, hashFileBuffer } from "@/lib/bcp/pdf";
import { convertPenToUsd, fetchHistoricalUsdToPen } from "@/lib/currency";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  BcpImportPayload,
  BcpImportPreview,
  BcpPreviewTransaction,
} from "@/types/bcp";

const BCP_ACCESS_TOKEN = "manual-import";

function bcpItemId(userId: string) {
  return `bcp-manual-${userId}`;
}

export function resolveBcpPassword(override?: string | null): string {
  const password = override?.trim() || process.env.BCP_PDF_PASSWORD?.trim();

  if (!password) {
    throw new Error("Missing BCP PDF password. Set BCP_PDF_PASSWORD in your environment.");
  }

  return password;
}

export async function parseBcpStatementFile(
  buffer: Buffer,
  password: string
): Promise<BcpImportPreview> {
  const pages = await extractBcpPdfText(buffer, password);
  const parsed = parseBcpStatement(pages);
  const rateCache = new Map<string, number>();
  const transactions: BcpPreviewTransaction[] = [];

  for (const transaction of parsed.transactions) {
    const usdToPen = await fetchHistoricalUsdToPen(transaction.date, rateCache);
    const amountUsd = convertPenToUsd(transaction.amountPen, usdToPen);

    transactions.push({
      ...transaction,
      amountUsd,
      usdToPen,
    });
  }

  return {
    accountCode: parsed.accountCode,
    currency: parsed.currency,
    period: parsed.period,
    openingBalancePen: parsed.openingBalancePen,
    closingBalancePen: parsed.closingBalancePen,
    totalDebitsPen: parsed.totalDebitsPen,
    totalCreditsPen: parsed.totalCreditsPen,
    transactions,
    warnings: parsed.warnings,
    fileHash: hashFileBuffer(buffer),
  };
}

async function ensureBcpPlaidItem(supabase: SupabaseClient, userId: string) {
  const itemId = bcpItemId(userId);

  const { data: existingItem } = await supabase
    .from("plaid_items")
    .select("id")
    .eq("item_id", itemId)
    .maybeSingle();

  if (existingItem) {
    return existingItem.id;
  }

  const { data: insertedItem, error } = await supabase
    .from("plaid_items")
    .insert({
      access_token: BCP_ACCESS_TOKEN,
      item_id: itemId,
      user_id: userId,
      institution_name: "BCP",
      last_synced_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error || !insertedItem) {
    throw new Error(error?.message ?? "Failed to create BCP institution record");
  }

  return insertedItem.id;
}

function buildPlaidAccountId(accountCode: string): string {
  return `bcp-${accountCode}`;
}

function accountMask(accountCode: string): string {
  const digits = accountCode.replace(/\D/g, "");
  return digits.slice(-4) || accountCode;
}

export async function importBcpStatement(
  supabase: SupabaseClient,
  userId: string,
  payload: BcpImportPayload
) {

  if (!payload.force) {
    const { data: existingImport } = await supabase
      .from("statement_imports")
      .select("id, imported_at")
      .eq("file_hash", payload.fileHash)
      .maybeSingle();

    if (existingImport) {
      throw new Error("This statement has already been imported");
    }
  }

  const plaidItemId = await ensureBcpPlaidItem(supabase, userId);
  const plaidAccountId = buildPlaidAccountId(payload.accountCode);
  const closingRate = await fetchHistoricalUsdToPen(payload.period.end);
  const closingBalanceUsd =
    payload.closingBalancePen === null
      ? null
      : convertPenToUsd(payload.closingBalancePen, closingRate);

  const { data: existingAccount } = await supabase
    .from("accounts")
    .select("balance_anchor_usd")
    .eq("plaid_account_id", plaidAccountId)
    .maybeSingle();

  const accountPayload: {
    plaid_account_id: string;
    plaid_item_id: string;
    user_id: string;
    name: string;
    balance_usd?: number;
    mask: string;
    subtype: string;
  } = {
    plaid_account_id: plaidAccountId,
    plaid_item_id: plaidItemId,
    user_id: userId,
    name: "BCP Cuenta Digital",
    mask: accountMask(payload.accountCode),
    subtype: "savings",
  };

  if (existingAccount?.balance_anchor_usd === null || !existingAccount) {
    accountPayload.balance_usd = closingBalanceUsd ?? 0;
  }

  const { data: accountRow, error: accountError } = await supabase
    .from("accounts")
    .upsert(accountPayload, { onConflict: "plaid_account_id" })
    .select("id")
    .single();

  if (accountError || !accountRow) {
    throw new Error(accountError?.message ?? "Failed to save BCP account");
  }

  const recurringFlags = detectRecurringTransactions(
    payload.transactions.map((transaction) => ({
      name: transaction.description,
      amount_usd: toPlaidSignedAmount(
        transaction.amountPen,
        transaction.amountUsd,
        transaction.type
      ),
      date: transaction.date,
    }))
  );

  const plaidIds = payload.transactions.map((transaction) =>
    buildBcpTransactionId(payload.accountCode, transaction)
  );
  const { data: existingRows } = plaidIds.length
    ? await supabase
        .from("transactions")
        .select("plaid_transaction_id, category_id, category_source")
        .in("plaid_transaction_id", plaidIds)
    : { data: [] };

  const existingMap = new Map(
    (existingRows ?? []).map((row) => [row.plaid_transaction_id, row])
  );

  const transactionPayloads = payload.transactions.map((transaction, index) => {
    const plaidTransactionId = buildBcpTransactionId(payload.accountCode, transaction);
    const mappedCategory = transaction.categoryId || mapBcpCategory(transaction.description);
    const existing = existingMap.get(plaidTransactionId);
    const categoryId =
      existing && existing.category_source !== "auto"
        ? existing.category_id
        : mappedCategory;
    const categorySource =
      existing && existing.category_source !== "auto" ? existing.category_source : "auto";

    return {
      plaid_transaction_id: plaidTransactionId,
      account_id: accountRow.id,
      user_id: userId,
      date: transaction.date,
      name: transaction.description,
      amount_usd: toPlaidSignedAmount(
        transaction.amountPen,
        transaction.amountUsd,
        transaction.type
      ),
      category_id: categoryId,
      category_source: categorySource,
      plaid_category: null,
      is_recurring: recurringFlags[index] ?? false,
      source: "bcp",
    };
  });

  const { error: txError, data: txData } = await supabase
    .from("transactions")
    .upsert(transactionPayloads, { onConflict: "plaid_transaction_id" })
    .select("id");

  const imported = txData?.length ?? 0;
  const skipped = transactionPayloads.length - imported;

  if (txError) {
    throw new Error(txError.message);
  }

  if (payload.force) {
    await supabase.from("statement_imports").delete().eq("file_hash", payload.fileHash);
  }

  const { error: importError } = await supabase.from("statement_imports").insert({
    source: "bcp",
    user_id: userId,
    account_code: payload.accountCode,
    period_start: payload.period.start,
    period_end: payload.period.end,
    file_hash: payload.fileHash,
    transaction_count: imported,
  });

  if (importError) {
    throw new Error(importError.message);
  }

  await supabase
    .from("plaid_items")
    .update({ last_synced_at: new Date().toISOString() })
    .eq("id", plaidItemId);

  return {
    imported,
    skipped,
    accountId: accountRow.id,
  };
}

export async function checkDuplicateImport(
  supabase: SupabaseClient,
  fileHash: string
) {
  const { data } = await supabase
    .from("statement_imports")
    .select("id, imported_at, period_start, period_end")
    .eq("file_hash", fileHash)
    .maybeSingle();

  return data;
}
