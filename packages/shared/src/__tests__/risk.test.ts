import assert from "node:assert/strict";
import test from "node:test";
import { createEmptyLedger, createRiskLimits, evaluateRisk, type MarketSnapshot, type TradeIntent } from "../index.js";

const snapshot: MarketSnapshot = {
  id: "snap_test",
  symbol: "BTCUSD",
  timeframe: "1h",
  price: 50_000,
  timestamp: "2026-04-24T16:00:00.000Z",
  source: "mock"
};

const intent: TradeIntent = {
  id: "intent_test",
  timestamp: "2026-04-24T16:00:10.000Z",
  mode: "paper",
  strategyId: "test-strategy",
  symbol: "BTCUSD",
  side: "long",
  action: "open",
  quantity: 0.1,
  confidence: 0.7,
  rationale: "Paper test intent.",
  snapshotId: "snap_test"
};

test("evaluateRisk approves a fresh paper intent inside limits", () => {
  const ledger = createEmptyLedger(100_000);
  const result = evaluateRisk(intent, {
    now: "2026-04-24T16:00:30.000Z",
    snapshot,
    openPositions: ledger.positions,
    equity: 100_000,
    dailyRealizedPnl: 0,
    duplicateIntentIds: new Set(),
    limits: createRiskLimits()
  });

  assert.equal(result.approved, true);
  assert.equal(result.reasons.length, 0);
});

test("evaluateRisk blocks stale data and duplicate intents", () => {
  const result = evaluateRisk(intent, {
    now: "2026-04-24T16:05:30.000Z",
    snapshot,
    openPositions: [],
    equity: 100_000,
    dailyRealizedPnl: 0,
    duplicateIntentIds: new Set(["intent_test"]),
    limits: createRiskLimits({ staleDataMs: 60_000 })
  });

  assert.equal(result.approved, false);
  assert.match(result.reasons.join(" "), /Duplicate order intents/);
  assert.match(result.reasons.join(" "), /too old/);
});

test("evaluateRisk blocks live-disabled mode", () => {
  const result = evaluateRisk({ ...intent, mode: "live-disabled" }, {
    now: "2026-04-24T16:00:30.000Z",
    snapshot,
    openPositions: [],
    equity: 100_000,
    dailyRealizedPnl: 0,
    duplicateIntentIds: new Set(),
    limits: createRiskLimits()
  });

  assert.equal(result.approved, false);
  assert.match(result.reasons.join(" "), /Live-money mode is disabled/);
});
