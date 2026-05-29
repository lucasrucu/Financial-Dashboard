import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import { parseBcpStatement } from "@/lib/bcp/parser";
import { extractBcpPdfText } from "@/lib/bcp/pdf";

const SAMPLE_PDF =
  process.env.BCP_SAMPLE_PDF ??
  "c:/Users/lucas.ruiz/Downloads/EECC042026_10378820.PDF";
const SAMPLE_PASSWORD = process.env.BCP_PDF_PASSWORD ?? "78886182";

test("parses BCP savings statement transactions", async () => {
  if (!fs.existsSync(SAMPLE_PDF)) {
    console.log(`Skipping BCP parser test; sample PDF not found at ${SAMPLE_PDF}`);
    return;
  }

  const buffer = fs.readFileSync(SAMPLE_PDF);
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

  const yapeIncome = parsed.transactions.find((transaction) =>
    transaction.description.includes("Yape Venta USD")
  );
  assert.ok(yapeIncome);
  assert.equal(yapeIncome.type, "credit");
});
