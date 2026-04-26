import assert from "node:assert/strict";
import test from "node:test";
import { calculateMaxDrawdownPct, createDailySummary, createEmptyLedger, summarizePerformance } from "../index.js";

test("calculateMaxDrawdownPct measures peak-to-trough decline", () => {
  const drawdown = calculateMaxDrawdownPct([
    { timestamp: "t1", equity: 100, cash: 100, realizedPnl: 0, unrealizedPnl: 0 },
    { timestamp: "t2", equity: 120, cash: 120, realizedPnl: 20, unrealizedPnl: 0 },
    { timestamp: "t3", equity: 90, cash: 90, realizedPnl: -10, unrealizedPnl: 0 }
  ]);

  assert.equal(drawdown, 25);
});

test("daily summaries use paper-safe language", () => {
  const ledger = createEmptyLedger(100_000, "2026-04-24T16:00:00.000Z");
  const summary = createDailySummary({
    id: "summary_test",
    kind: "morning",
    timezone: "America/Los_Angeles",
    generatedAt: "2026-04-24T16:00:00.000Z",
    ledger
  });

  assert.match(summary.body, /paper-trading research summary/);
  assert.doesNotMatch(summary.body, /buy\/sell now/i);
  assert.equal(summarizePerformance(ledger).equity, 100_000);
});
