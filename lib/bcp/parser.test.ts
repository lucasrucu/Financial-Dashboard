import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import { parseBcpStatementFile } from "@/lib/bcp/import";
import { parseAccountHeaderLine, parseBcpStatement } from "@/lib/bcp/parser";
import { extractBcpPdfText } from "@/lib/bcp/pdf";

const SAMPLE_PASSWORD = process.env.BCP_PDF_PASSWORD ?? "78886182";

const SOLES_FIXTURES = [
  {
    label: "EECC (3)",
    path: "c:/Users/lucas/Downloads/EECC (3).pdf",
    period: { start: "2026-03-01", end: "2026-03-31" },
    minTransactions: 65,
  },
  {
    label: "EECC (2)",
    path: "c:/Users/lucas/Downloads/EECC (2).pdf",
    period: { start: "2026-04-01", end: "2026-04-30" },
    minTransactions: 70,
  },
  {
    label: "EECC (1)",
    path: "c:/Users/lucas/Downloads/EECC (1).pdf",
    period: { start: "2026-05-01", end: "2026-05-31" },
    minTransactions: 75,
  },
] as const;

const USD_FIXTURES = [
  {
    label: "EECC (5)",
    path: "c:/Users/lucas/Downloads/EECC (5).pdf",
    period: { start: "2026-03-01", end: "2026-03-31" },
    minTransactions: 12,
  },
  {
    label: "EECC (4)",
    path: "c:/Users/lucas/Downloads/EECC (4).pdf",
    period: { start: "2026-04-01", end: "2026-04-30" },
    minTransactions: 8,
  },
] as const;

const DETAILED_SOLES_PDF = "c:/Users/lucas/Downloads/EECC (2).pdf";
const DETAILED_USD_PDF = "c:/Users/lucas/Downloads/EECC (4).pdf";

test("parseAccountHeaderLine recognizes soles and US DOLARES", () => {
  assert.deepEqual(parseAccountHeaderLine("194-05372749-0-18 SOLES"), {
    accountCode: "194-05372749-0-18",
    currency: "SOLES",
  });
  assert.deepEqual(parseAccountHeaderLine("194-78378083-1-78 US DOLARES"), {
    accountCode: "194-78378083-1-78",
    currency: "USD",
  });
});

for (const fixture of SOLES_FIXTURES) {
  test(`parses ${fixture.label} soles statement metadata`, async () => {
    if (!fs.existsSync(fixture.path)) {
      console.log(`Skipping BCP parser test; sample PDF not found at ${fixture.path}`);
      return;
    }

    const buffer = fs.readFileSync(fixture.path);
    const pages = await extractBcpPdfText(buffer, SAMPLE_PASSWORD);
    const parsed = parseBcpStatement(pages);

    assert.equal(parsed.accountCode, "194-05372749-0-18");
    assert.equal(parsed.currency, "SOLES");
    assert.equal(parsed.period.start, fixture.period.start);
    assert.equal(parsed.period.end, fixture.period.end);
    assert.ok(parsed.transactions.length >= fixture.minTransactions);
    assert.equal(parsed.warnings.length, 0);
  });
}

for (const fixture of USD_FIXTURES) {
  test(`parses ${fixture.label} USD statement metadata`, async () => {
    if (!fs.existsSync(fixture.path)) {
      console.log(`Skipping BCP parser test; sample PDF not found at ${fixture.path}`);
      return;
    }

    const buffer = fs.readFileSync(fixture.path);
    const pages = await extractBcpPdfText(buffer, SAMPLE_PASSWORD);
    const parsed = parseBcpStatement(pages);

    assert.equal(parsed.accountCode, "194-78378083-1-78");
    assert.equal(parsed.currency, "USD");
    assert.equal(parsed.period.start, fixture.period.start);
    assert.equal(parsed.period.end, fixture.period.end);
    assert.ok(parsed.transactions.length >= fixture.minTransactions);
    assert.equal(parsed.warnings.length, 0);
  });
}

test("parses BCP soles statement transactions", async () => {
  if (!fs.existsSync(DETAILED_SOLES_PDF)) {
    console.log(
      `Skipping BCP parser test; sample PDF not found at ${DETAILED_SOLES_PDF}`
    );
    return;
  }

  const buffer = fs.readFileSync(DETAILED_SOLES_PDF);
  const pages = await extractBcpPdfText(buffer, SAMPLE_PASSWORD);
  const parsed = parseBcpStatement(pages);

  assert.equal(parsed.accountCode, "194-05372749-0-18");
  assert.equal(parsed.currency, "SOLES");
  assert.equal(parsed.period.start, "2026-04-01");
  assert.equal(parsed.period.end, "2026-04-30");
  assert.equal(parsed.openingBalancePen, 1181.72);
  assert.equal(parsed.closingBalancePen, 1460.44);
  assert.equal(parsed.totalDebitsPen, 3598.63);
  assert.equal(parsed.totalCreditsPen, 3877.35);
  assert.ok(parsed.transactions.length >= 70);

  const spotify = parsed.transactions.find((transaction) =>
    transaction.description.includes("SPOTIFY")
  );
  assert.ok(spotify);
  assert.equal(spotify.type, "debit");
  assert.equal(spotify.amountPen, 32.9);
  assert.equal(spotify.categoryId, "subscriptions");

  const yapeIncome = parsed.transactions.find((transaction) =>
    transaction.description.includes("Yape Venta USD")
  );
  assert.ok(yapeIncome);
  assert.equal(yapeIncome.type, "credit");
  assert.equal(yapeIncome.categoryId, "other");

  const yapePayment = parsed.transactions.find((transaction) =>
    transaction.description.includes("Pago YAPE")
  );
  assert.ok(yapePayment);
  assert.equal(yapePayment.categoryId, "other");
});

test("parseBcpStatementFile keeps USD amounts unchanged", async () => {
  if (!fs.existsSync(DETAILED_USD_PDF)) {
    console.log(
      `Skipping BCP parser test; sample PDF not found at ${DETAILED_USD_PDF}`
    );
    return;
  }

  const buffer = fs.readFileSync(DETAILED_USD_PDF);
  const preview = await parseBcpStatementFile(buffer, SAMPLE_PASSWORD);

  assert.equal(preview.accountCode, "194-78378083-1-78");
  assert.equal(preview.currency, "USD");
  assert.equal(preview.warnings.length, 0);
  assert.ok(preview.transactions.length >= 8);

  const crunchyroll = preview.transactions.find((transaction) =>
    transaction.description.includes("CRUNCHYROLL")
  );
  assert.ok(crunchyroll);
  assert.equal(crunchyroll.amountPen, 6.32);
  assert.equal(crunchyroll.amountUsd, 6.32);
  assert.equal(crunchyroll.usdToPen, 1);
});
