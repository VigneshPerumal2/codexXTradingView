export type TradingMode = "backtest" | "paper" | "live-disabled";
export type TradeSide = "long" | "short";
export type TradeAction = "open" | "close";
export type OrderStatus = "proposed" | "approved" | "rejected" | "filled" | "closed";
export type AgentName =
  | "MarketDataAgent"
  | "StrategyAgent"
  | "RiskManagerAgent"
  | "PaperExecutionAgent"
  | "PerformanceAgent"
  | "SummaryAgent"
  | "SupervisorAgent";

export interface MarketSnapshot {
  id: string;
  symbol: string;
  timeframe: string;
  price: number;
  timestamp: string;
  source: "tradingview-mcp" | "sample" | "mock";
  quote?: Record<string, unknown>;
  state?: Record<string, unknown>;
  indicators?: Record<string, unknown>;
  stale?: boolean;
}

export interface TradeIntent {
  id: string;
  timestamp: string;
  mode: TradingMode;
  strategyId: string;
  symbol: string;
  side: TradeSide;
  action: TradeAction;
  quantity: number;
  confidence: number;
  rationale: string;
  snapshotId: string;
  expectedEntry?: number;
}

export interface RiskLimits {
  startingCapital: number;
  maxDailyLossPct: number;
  maxPositionNotionalPct: number;
  maxOpenPositions: number;
  staleDataMs: number;
  slippageBps: number;
  feeBps: number;
  enforceMarketHours: boolean;
  killSwitch: boolean;
}

export interface RiskCheck {
  name: string;
  passed: boolean;
  severity: "info" | "warning" | "blocker";
  message: string;
  value?: number | string | boolean;
  limit?: number | string | boolean;
}

export interface RiskResult {
  id: string;
  intentId: string;
  snapshotId: string;
  approved: boolean;
  createdAt: string;
  checks: RiskCheck[];
  reasons: string[];
}

export interface RiskContext {
  now: string;
  snapshot: MarketSnapshot;
  openPositions: PaperPosition[];
  equity: number;
  dailyRealizedPnl: number;
  duplicateIntentIds: Set<string>;
  limits: RiskLimits;
}

export interface PaperOrder {
  id: string;
  intentId: string;
  snapshotId: string;
  status: OrderStatus;
  symbol: string;
  side: TradeSide;
  action: TradeAction;
  quantity: number;
  createdAt: string;
  approvedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  mode: TradingMode;
}

export interface PaperFill {
  id: string;
  orderId: string;
  intentId: string;
  snapshotId: string;
  symbol: string;
  side: TradeSide;
  action: TradeAction;
  quantity: number;
  referencePrice: number;
  fillPrice: number;
  slippageBps: number;
  fee: number;
  notional: number;
  filledAt: string;
  assumptions: string[];
}

export interface PaperPosition {
  id: string;
  symbol: string;
  side: TradeSide;
  quantity: number;
  averageEntry: number;
  openedAt: string;
  updatedAt: string;
  strategyId: string;
  snapshotId: string;
  unrealizedPnl?: number;
}

export interface PaperTrade {
  id: string;
  symbol: string;
  side: TradeSide;
  quantity: number;
  entryPrice: number;
  exitPrice?: number;
  openedAt: string;
  closedAt?: string;
  realizedPnl?: number;
  fees: number;
  strategyId: string;
  mode: TradingMode;
}

export interface EquityPoint {
  timestamp: string;
  equity: number;
  cash: number;
  realizedPnl: number;
  unrealizedPnl: number;
}

export interface PaperLedger {
  cash: number;
  startingCapital: number;
  realizedPnl: number;
  positions: PaperPosition[];
  trades: PaperTrade[];
  fills: PaperFill[];
  equityCurve: EquityPoint[];
  seenIntentIds: string[];
}

export interface AgentEvent {
  id: string;
  agent: AgentName;
  level: "info" | "warning" | "error";
  message: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface StrategyDecision {
  id: string;
  strategyId: string;
  snapshotId: string;
  mode: TradingMode;
  score: number;
  confidence: number;
  rationale: string;
  intent?: TradeIntent;
  createdAt: string;
}

export interface DailySummary {
  id: string;
  kind: "morning" | "evening";
  timezone: string;
  generatedAt: string;
  headline: string;
  body: string;
  metrics: PerformanceSummary;
}

export interface PerformanceSummary {
  equity: number;
  cash: number;
  realizedPnl: number;
  unrealizedPnl: number;
  totalPnl: number;
  totalPnlPct: number;
  maxDrawdownPct: number;
  winRatePct: number;
  openPositions: number;
  closedTrades: number;
}

export interface DashboardState {
  snapshots: MarketSnapshot[];
  decisions: StrategyDecision[];
  riskResults: RiskResult[];
  ledger: PaperLedger;
  agentEvents: AgentEvent[];
  summaries: DailySummary[];
  limits: RiskLimits;
}
