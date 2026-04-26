import { createDailySummary } from "./performance.js";
import { createEmptyLedger } from "./paper.js";
import { createRiskLimits } from "./risk.js";
import type { AgentEvent, DashboardState, MarketSnapshot, RiskResult, StrategyDecision } from "./types.js";

const now = "2026-04-24T16:30:00.000Z";
const morning = "2026-04-24T16:00:00.000Z";

const snapshots: MarketSnapshot[] = [
  {
    id: "snap_btc_1h_001",
    symbol: "BTCUSD",
    timeframe: "1h",
    price: 64250.25,
    timestamp: "2026-04-24T16:25:00.000Z",
    source: "sample",
    indicators: { rsi: 58.4, volumeTrend: "rising", emaBias: "bullish" }
  },
  {
    id: "snap_nvda_15m_001",
    symbol: "NASDAQ:NVDA",
    timeframe: "15m",
    price: 912.42,
    timestamp: "2026-04-24T16:27:00.000Z",
    source: "sample",
    indicators: { rsi: 46.7, volumeTrend: "flat", emaBias: "neutral" }
  }
];

const ledger = createEmptyLedger(100_000, "2026-04-23T16:00:00.000Z");
ledger.cash = 100_362.42;
ledger.realizedPnl = 418.26;
ledger.positions = [
  {
    id: "position_BTCUSD_long",
    symbol: "BTCUSD",
    side: "long",
    quantity: 0.12,
    averageEntry: 63880,
    openedAt: "2026-04-24T15:14:00.000Z",
    updatedAt: "2026-04-24T16:25:00.000Z",
    strategyId: "momentum-rsi-volume",
    snapshotId: "snap_btc_1h_001",
    unrealizedPnl: 44.43
  }
];
ledger.trades = [
  {
    id: "trade_sample_001",
    symbol: "NASDAQ:AAPL",
    side: "long",
    quantity: 12,
    entryPrice: 188.2,
    exitPrice: 191.4,
    openedAt: "2026-04-23T17:12:00.000Z",
    closedAt: "2026-04-23T20:45:00.000Z",
    realizedPnl: 37.9,
    fees: 0.5,
    strategyId: "mean-reversion-vwap",
    mode: "paper"
  },
  {
    id: "trade_sample_002",
    symbol: "BTCUSD",
    side: "long",
    quantity: 0.12,
    entryPrice: 63880,
    openedAt: "2026-04-24T15:14:00.000Z",
    fees: 7.67,
    strategyId: "momentum-rsi-volume",
    mode: "paper"
  }
];
ledger.equityCurve = [
  { timestamp: "2026-04-21T16:00:00.000Z", equity: 100_000, cash: 100_000, realizedPnl: 0, unrealizedPnl: 0 },
  { timestamp: "2026-04-22T16:00:00.000Z", equity: 100_184.1, cash: 100_111.3, realizedPnl: 111.3, unrealizedPnl: 72.8 },
  { timestamp: "2026-04-23T16:00:00.000Z", equity: 100_295.7, cash: 100_318.9, realizedPnl: 318.9, unrealizedPnl: -23.2 },
  { timestamp: "2026-04-24T16:30:00.000Z", equity: 100_406.85, cash: 100_362.42, realizedPnl: 418.26, unrealizedPnl: 44.43 }
];
ledger.seenIntentIds = ["intent_sample_001", "intent_sample_002"];

const decisions: StrategyDecision[] = [
  {
    id: "decision_sample_001",
    strategyId: "momentum-rsi-volume",
    snapshotId: "snap_btc_1h_001",
    mode: "paper",
    score: 0.72,
    confidence: 0.64,
    rationale: "BTCUSD trend and volume are aligned, but confidence remains capped because this is a paper-only research signal.",
    createdAt: now,
    intent: {
      id: "intent_sample_003",
      timestamp: now,
      mode: "paper",
      strategyId: "momentum-rsi-volume",
      symbol: "BTCUSD",
      side: "long",
      action: "open",
      quantity: 0.05,
      confidence: 0.64,
      rationale: "Paper-only continuation probe after RSI confirmed above neutral.",
      snapshotId: "snap_btc_1h_001",
      expectedEntry: 64250.25
    }
  }
];

const riskResults: RiskResult[] = [
  {
    id: "risk_intent_sample_003",
    intentId: "intent_sample_003",
    snapshotId: "snap_btc_1h_001",
    approved: true,
    createdAt: now,
    checks: [
      { name: "mode", passed: true, severity: "blocker", message: "Live-money mode is disabled in V1.", value: "paper" },
      { name: "position-notional", passed: true, severity: "blocker", message: "Intent notional is inside per-position risk limit.", value: 3212.51, limit: 10040.68 },
      { name: "stale-data", passed: true, severity: "blocker", message: "Market snapshot is fresh.", value: 30000, limit: 60000 }
    ],
    reasons: []
  }
];

const agentEvents: AgentEvent[] = [
  {
    id: "event_market_001",
    agent: "MarketDataAgent",
    level: "info",
    message: "Captured TradingView snapshot from read-only CLI adapter.",
    createdAt: "2026-04-24T16:25:00.000Z",
    metadata: { symbol: "BTCUSD", timeframe: "1h" }
  },
  {
    id: "event_risk_001",
    agent: "RiskManagerAgent",
    level: "info",
    message: "Paper intent approved after deterministic risk checks.",
    createdAt: now,
    metadata: { intentId: "intent_sample_003" }
  },
  {
    id: "event_supervisor_001",
    agent: "SupervisorAgent",
    level: "warning",
    message: "Redis scheduler not connected in sample mode; local dashboard remains read-only.",
    createdAt: now
  }
];

const limits = createRiskLimits();

export const sampleDashboardState: DashboardState = {
  snapshots,
  decisions,
  riskResults,
  ledger,
  agentEvents,
  summaries: [
    createDailySummary({ id: "summary_morning_sample", kind: "morning", timezone: "America/Los_Angeles", generatedAt: morning, ledger }),
    createDailySummary({ id: "summary_evening_sample", kind: "evening", timezone: "America/Los_Angeles", generatedAt: now, ledger })
  ],
  limits
};
