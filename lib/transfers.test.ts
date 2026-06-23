import { test } from "node:test";
import assert from "node:assert/strict";

import { findTransferCandidates, type TransferLeg } from "@/lib/transfers";

function leg(partial: Partial<TransferLeg> & { id: string; amount_usd: number }): TransferLeg {
  return {
    date: "2026-06-10",
    name: "Transfer",
    account_id: "acct-a",
    account_name: "Account A",
    category_id: "other",
    plaid_category: null,
    ...partial,
  };
}

test("pairs an exact-amount move across two accounts", () => {
  const pairs = findTransferCandidates([
    leg({ id: "out", amount_usd: 500, account_id: "a", date: "2026-06-10" }),
    leg({ id: "in", amount_usd: -500, account_id: "b", date: "2026-06-10" }),
  ]);
  assert.equal(pairs.length, 1);
  assert.equal(pairs[0].outflow.id, "out");
  assert.equal(pairs[0].inflow.id, "in");
});

test("pairs across a fee gap (send 1000, 980 arrives)", () => {
  const pairs = findTransferCandidates([
    leg({ id: "out", amount_usd: 1000, account_id: "a", date: "2026-06-10" }),
    leg({ id: "in", amount_usd: -980, account_id: "b", date: "2026-06-12" }),
  ]);
  assert.equal(pairs.length, 1);
  assert.equal(pairs[0].deltaUsd, 20);
  assert.equal(pairs[0].daysApart, 2);
});

test("pairs a cross-currency move within tolerance", () => {
  // PEN→USD with spread: 300 out, 276 in => ratio 0.92 >= 0.9
  const pairs = findTransferCandidates([
    leg({ id: "out", amount_usd: 300, account_id: "pe", date: "2026-06-10" }),
    leg({ id: "in", amount_usd: -276, account_id: "us", date: "2026-06-13" }),
  ]);
  assert.equal(pairs.length, 1);
});

test("does NOT pair amounts that differ beyond tolerance", () => {
  const pairs = findTransferCandidates([
    leg({ id: "out", amount_usd: 1000, account_id: "a" }),
    leg({ id: "in", amount_usd: -500, account_id: "b" }),
  ]);
  assert.equal(pairs.length, 0);
});

test("does NOT pair within the same account", () => {
  const pairs = findTransferCandidates([
    leg({ id: "out", amount_usd: 500, account_id: "a" }),
    leg({ id: "in", amount_usd: -500, account_id: "a" }),
  ]);
  assert.equal(pairs.length, 0);
});

test("does NOT pair when too far apart in time", () => {
  const pairs = findTransferCandidates([
    leg({ id: "out", amount_usd: 500, account_id: "a", date: "2026-06-01" }),
    leg({ id: "in", amount_usd: -500, account_id: "b", date: "2026-06-20" }),
  ]);
  assert.equal(pairs.length, 0);
});

test("ignores transactions already marked as transfer", () => {
  const pairs = findTransferCandidates([
    leg({ id: "out", amount_usd: 500, account_id: "a", category_id: "transfer" }),
    leg({ id: "in", amount_usd: -500, account_id: "b", category_id: "transfer" }),
  ]);
  assert.equal(pairs.length, 0);
});

test("each leg is used at most once", () => {
  const pairs = findTransferCandidates([
    leg({ id: "out1", amount_usd: 500, account_id: "a", date: "2026-06-10" }),
    leg({ id: "out2", amount_usd: 500, account_id: "a", date: "2026-06-10" }),
    leg({ id: "in1", amount_usd: -500, account_id: "b", date: "2026-06-10" }),
  ]);
  assert.equal(pairs.length, 1);
});
