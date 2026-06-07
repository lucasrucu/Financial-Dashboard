import { mapBcpCategory } from "@/lib/bcp/categories";
import type { BcpPdfPageText } from "@/lib/bcp/pdf";
import type { BcpParsedStatement, BcpParsedTransaction } from "@/types/bcp";

const MONTHS: Record<string, number> = {
  ENE: 0,
  FEB: 1,
  MAR: 2,
  ABR: 3,
  MAY: 4,
  JUN: 5,
  JUL: 6,
  AGO: 7,
  SEP: 8,
  OCT: 9,
  NOV: 10,
  DIC: 11,
};

const TRANSACTION_LINE = /^(\d{2}[A-Z]{3})\s+(\d{2}[A-Z]{3})\s+(.+)$/;
const AMOUNT_PATTERN = /^[\d,]+\.\d{2}$/;
const CREDIT_AMOUNT_X_THRESHOLD = 450;

function parseAmount(value: string): number {
  return Number(value.replace(/,/g, ""));
}

function parseDdMmmDate(token: string, periodStart: string, periodEnd: string): string {
  const day = Number(token.slice(0, 2));
  const monthKey = token.slice(2).toUpperCase();
  const month = MONTHS[monthKey];

  if (month === undefined) {
    throw new Error(`Unknown month token: ${token}`);
  }

  const startYear = Number(periodStart.slice(0, 4));
  const endYear = Number(periodEnd.slice(0, 4));
  const startMonth = Number(periodStart.slice(5, 7)) - 1;

  let year = endYear;

  if (startYear !== endYear) {
    year = month >= startMonth ? startYear : endYear;
  }

  const date = new Date(Date.UTC(year, month, day));
  return date.toISOString().slice(0, 10);
}

function parseStatementPeriod(line: string): { start: string; end: string } | null {
  const match = line.match(/DEL\s+(\d{2}\/\d{2}\/\d{2})\s+AL\s+(\d{2}\/\d{2}\/\d{2})/i);

  if (!match) {
    return null;
  }

  return {
    start: toIsoDate(match[1]),
    end: toIsoDate(match[2]),
  };
}

function toIsoDate(value: string): string {
  const [day, month, yearPart] = value.split("/");
  const year = Number(yearPart) + (Number(yearPart) >= 70 ? 1900 : 2000);
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

const ACCOUNT_HEADER_PATTERN =
  /(\d{3}-\d{8}-\d-\d{2})\s+(SOLES|US\s*DOLAR(?:ES)?|DÓLARES?|USD)/i;

function normalizeBcpCurrency(raw: string): "SOLES" | "USD" {
  const normalized = raw.replace(/\s+/g, " ").trim().toUpperCase();

  if (normalized === "SOLES") {
    return "SOLES";
  }

  return "USD";
}

export function parseAccountHeaderLine(
  line: string
): { accountCode: string; currency: "SOLES" | "USD" } | null {
  const match = line.match(ACCOUNT_HEADER_PATTERN);

  if (!match) {
    return null;
  }

  return {
    accountCode: match[1],
    currency: normalizeBcpCurrency(match[2]),
  };
}

function parseTransactionLine(
  line: string,
  items: Array<{ x: number; str: string }>,
  periodStart: string,
  periodEnd: string
): BcpParsedTransaction | null {
  const match = line.match(TRANSACTION_LINE);

  if (!match) {
    return null;
  }

  const [, procDateToken, valueDateToken, remainder] = match;
  const numericItems = items.filter((item) => AMOUNT_PATTERN.test(item.str));

  if (!numericItems.length) {
    return null;
  }

  const amountItem = numericItems[numericItems.length - 1];
  const amountPen = parseAmount(amountItem.str);

  if (amountPen === 0) {
    return null;
  }

  const type = amountItem.x >= CREDIT_AMOUNT_X_THRESHOLD ? "credit" : "debit";
  const description = remainder
    .replace(amountItem.str, "")
    .replace(/\s+\*\s*$/, "")
    .replace(/\s+\d\s*$/, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!description) {
    return null;
  }

  const date = parseDdMmmDate(valueDateToken || procDateToken, periodStart, periodEnd);

  return {
    date,
    description,
    amountPen,
    type,
    categoryId: mapBcpCategory(description),
  };
}

function parseHeaderAndFooter(
  pages: BcpPdfPageText[],
  warnings: string[]
): Omit<BcpParsedStatement, "transactions"> {
  const allLines = pages.flatMap((page) => page.lines);
  const allItems = pages.flatMap((page) => page.items);

  let accountCode = "";
  let currency = "SOLES";
  let period = { start: "", end: "" };
  let openingBalancePen = 0;
  let closingBalancePen: number | null = null;
  let totalDebitsPen: number | null = null;
  let totalCreditsPen: number | null = null;

  for (const line of allLines) {
    const accountHeader = parseAccountHeaderLine(line);

    if (accountHeader) {
      accountCode = accountHeader.accountCode;
      currency = accountHeader.currency;
    }

    const periodMatch = parseStatementPeriod(line);

    if (periodMatch) {
      period = periodMatch;
    }

    const openingMatch = line.match(/SALDO ANTERIOR\s+([\d,]+\.\d{2})/i);

    if (openingMatch) {
      openingBalancePen = parseAmount(openingMatch[1]);
    }
  }

  const lastPageLines = pages[pages.length - 1]?.lines ?? [];

  for (const line of lastPageLines) {
    const totalsMatch = line.match(/^([\d,]+\.\d{2})\s+([\d,]+\.\d{2})$/);

    if (totalsMatch) {
      totalDebitsPen = parseAmount(totalsMatch[1]);
      totalCreditsPen = parseAmount(totalsMatch[2]);
      continue;
    }

    const closingMatch = line.match(/^([\d,]+\.\d{2})$/);

    if (closingMatch && !line.includes("/")) {
      closingBalancePen = parseAmount(closingMatch[1]);
    }
  }

  if (!accountCode) {
    warnings.push("Could not detect account code from statement header");
  }

  if (!period.start || !period.end) {
    warnings.push("Could not detect statement period from header");
  }

  if (!allItems.length) {
    warnings.push("No text extracted from PDF");
  }

  return {
    accountCode,
    currency,
    period,
    openingBalancePen,
    closingBalancePen,
    totalDebitsPen,
    totalCreditsPen,
    warnings,
  };
}

export function parseBcpStatement(pages: BcpPdfPageText[]): BcpParsedStatement {
  const warnings: string[] = [];
  const header = parseHeaderAndFooter(pages, warnings);
  const transactions: BcpParsedTransaction[] = [];

  if (!header.period.start || !header.period.end) {
    return {
      ...header,
      transactions,
    };
  }

  for (const page of pages) {
    const itemsByLine = groupItemsByLine(page.items);

    for (const line of page.lines) {
      if (/^SALDO ANTERIOR/i.test(line) || /^MANT\.\s+CUENTA/i.test(line)) {
        continue;
      }

      const lineItems = itemsByLine.get(normalizeLine(line)) ?? [];
      const transaction = parseTransactionLine(
        line,
        lineItems,
        header.period.start,
        header.period.end
      );

      if (transaction) {
        transactions.push(transaction);
      }
    }
  }

  if (!transactions.length) {
    warnings.push("No transactions parsed from statement");
  }

  return {
    ...header,
    transactions,
  };
}

function groupItemsByLine(items: Array<{ x: number; y: number; str: string }>) {
  const lineMap = new Map<number, Array<{ x: number; str: string }>>();

  for (const item of items) {
    const bucket = lineMap.get(item.y) ?? [];
    bucket.push({ x: item.x, str: item.str });
    lineMap.set(item.y, bucket);
  }

  const grouped = new Map<string, Array<{ x: number; str: string }>>();

  for (const rowItems of Array.from(lineMap.values())) {
    rowItems.sort((a, b) => a.x - b.x);
    grouped.set(normalizeLine(rowItems.map((entry) => entry.str).join(" ")), rowItems);
  }

  return grouped;
}

function normalizeLine(line: string): string {
  return line.replace(/\s+/g, " ").trim();
}

export function buildBcpTransactionId(
  accountCode: string,
  transaction: Pick<BcpParsedTransaction, "date" | "description" | "amountPen" | "type">
): string {
  const normalizedDescription = transaction.description
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

  return [
    "bcp",
    accountCode,
    transaction.date,
    normalizedDescription,
    transaction.amountPen.toFixed(2),
    transaction.type,
  ].join(":");
}

export function toPlaidSignedAmount(
  amountPen: number,
  amountUsd: number,
  type: "debit" | "credit"
): number {
  const absoluteUsd = Math.abs(amountUsd);
  return type === "debit" ? absoluteUsd : -absoluteUsd;
}
