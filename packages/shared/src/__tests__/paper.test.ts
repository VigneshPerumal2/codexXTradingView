import assert from "node:assert/strict";
import test from "node:test";
import { applyPaperFill, createEmptyLedger, createPaperFill, createPaperOrder, createRiskLimits, type MarketSnapshot, type RiskResult, type TradeIntent } from "../index.js";

const snapshot: MarketSnapshot = {
  id: "snap_fill",
  symbol: "BTCUSD",
  timeframe: "1h",
  price: 100,
  timestamp: "2026-04-24T16:00:00.000Z",
  source: "mock"
};

const risk: RiskResult = {
  id: "risk_fill",
  intentId: "intent_fill",
  snapshotId: "snap_fill",
  approved: true,
  createdAt: "2026-04-24T16:00:01.000Z",
  checks: [],
  reasons: []
};

test("paper fills apply slippage and fees without broker side effects", () => {
  const intent: TradeIntent = {
    id: "intent_fill",
    timestamp: "2026-04-24T16:00:00.000Z",
    mode: "paper",
    strategyId: "test-strategy",
    symbol: "BTCUSD",
    side: "long",
    action: "open",
    quantity: 10,
    confidence: 0.8,
    rationale: "Paper-only test fill.",
    snapshotId: "snap_fill"
  };

  const order = createPaperOrder(intent, risk);
  const fill = createPaperFill(order, intent, snapshot, createRiskLimits({ slippageBps: 10, feeBps: 5 }));
  const ledger = applyPaperFill(createEmptyLedger(10_000), intent, fill);

  assert.equal(order.status, "approved");
  assert.equal(fill.fillPrice, 100.1);
  assert.equal(fill.fee, 0.5);
  assert.equal(ledger.positions.length, 1);
  assert.equal(ledger.seenIntentIds.includes(intent.id), true);
});

test("closing a long position realizes paper P&L", () => {
  const openIntent: TradeIntent = {
    id: "intent_open",
    timestamp: "2026-04-24T16:00:00.000Z",
    mode: "paper",
    strategyId: "test-strategy",
    symbol: "BTCUSD",
    side: "long",
    action: "open",
    quantity: 1,
    confidence: 0.8,
    rationale: "Open paper position.",
    snapshotId: "snap_fill"
  };
  const closeIntent: TradeIntent = { ...openIntent, id: "intent_close", action: "close", timestamp: "2026-04-24T17:00:00.000Z" };

  const limits = createRiskLimits({ slippageBps: 0, feeBps: 0 });
  const open = createPaperFill(createPaperOrder(openIntent, { ...risk, intentId: openIntent.id }), openIntent, snapshot, limits);
  const ledgerWithOpen = applyPaperFill(createEmptyLedger(10_000), openIntent, open);
  const close = createPaperFill(createPaperOrder(closeIntent, { ...risk, intentId: closeIntent.id }), closeIntent, { ...snapshot, price: 110 }, limits);
  const ledgerWithClose = applyPaperFill(ledgerWithOpen, closeIntent, close);

  assert.equal(ledgerWithClose.positions.length, 0);
  assert.equal(ledgerWithClose.realizedPnl, 10);
  assert.equal(ledgerWithClose.trades[0]?.realizedPnl, 10);
});
