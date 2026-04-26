import type { PaperPosition, RiskCheck, RiskContext, RiskLimits, RiskResult, TradeIntent } from "./types.js";

export const DEFAULT_RISK_LIMITS: RiskLimits = {
  startingCapital: 100_000,
  maxDailyLossPct: 0.02,
  maxPositionNotionalPct: 0.1,
  maxOpenPositions: 5,
  staleDataMs: 60_000,
  slippageBps: 5,
  feeBps: 1,
  enforceMarketHours: false,
  killSwitch: false
};

export function createRiskLimits(overrides: Partial<RiskLimits> = {}): RiskLimits {
  return { ...DEFAULT_RISK_LIMITS, ...overrides };
}

export function evaluateRisk(intent: TradeIntent, context: RiskContext): RiskResult {
  const checks: RiskCheck[] = [];
  const snapshotAgeMs = new Date(context.now).getTime() - new Date(context.snapshot.timestamp).getTime();
  const notional = Math.abs(intent.quantity * context.snapshot.price);
  const maxNotional = context.equity * context.limits.maxPositionNotionalPct;
  const maxDailyLoss = context.equity * context.limits.maxDailyLossPct;
  const matchingOpenPosition = findMatchingPosition(intent, context.openPositions);

  checks.push(check("mode", intent.mode !== "live-disabled", "blocker", "Live-money mode is disabled in V1.", intent.mode, "paper/backtest only"));
  checks.push(check("kill-switch", !context.limits.killSwitch, "blocker", "Kill switch must be off before any paper fill can be created.", context.limits.killSwitch, false));
  checks.push(check("duplicate-intent", !context.duplicateIntentIds.has(intent.id), "blocker", "Duplicate order intents are blocked.", intent.id));
  checks.push(check("snapshot-match", intent.snapshotId === context.snapshot.id, "blocker", "Intent must reference the exact market snapshot used for risk.", intent.snapshotId, context.snapshot.id));
  checks.push(check("stale-data", snapshotAgeMs <= context.limits.staleDataMs, "blocker", "Market snapshot is too old for a new paper decision.", snapshotAgeMs, context.limits.staleDataMs));
  checks.push(check("positive-price", context.snapshot.price > 0, "blocker", "Snapshot price must be positive.", context.snapshot.price));
  checks.push(check("positive-quantity", intent.quantity > 0, "blocker", "Intent quantity must be positive.", intent.quantity));
  checks.push(check("confidence-bounds", intent.confidence >= 0 && intent.confidence <= 1, "blocker", "Confidence must be a 0..1 score.", intent.confidence));
  checks.push(check("position-notional", notional <= maxNotional, "blocker", "Intent notional exceeds per-position risk limit.", round(notional), round(maxNotional)));
  checks.push(check("daily-loss", context.dailyRealizedPnl >= -maxDailyLoss, "blocker", "Daily realized loss limit has already been reached.", round(context.dailyRealizedPnl), round(-maxDailyLoss)));

  if (intent.action === "open" && !matchingOpenPosition) {
    checks.push(check("max-open-positions", context.openPositions.length < context.limits.maxOpenPositions, "blocker", "Open position limit reached.", context.openPositions.length, context.limits.maxOpenPositions));
  }

  if (intent.action === "close") {
    checks.push(check("close-existing-position", Boolean(matchingOpenPosition), "blocker", "Close intent requires an existing matching paper position.", intent.symbol));
  }

  if (context.limits.enforceMarketHours) {
    checks.push(check("market-hours", isAlwaysOnMarket(intent.symbol) || isUsRegularMarketOpen(new Date(context.now)), "blocker", "Market-hours enforcement blocked this paper intent.", context.now, "US regular session or always-on symbol"));
  }

  const failedBlockers = checks.filter((item) => !item.passed && item.severity === "blocker");

  return {
    id: `risk_${intent.id}`,
    intentId: intent.id,
    snapshotId: context.snapshot.id,
    approved: failedBlockers.length === 0,
    createdAt: context.now,
    checks,
    reasons: failedBlockers.map((item) => item.message)
  };
}

function findMatchingPosition(intent: TradeIntent, positions: PaperPosition[]): PaperPosition | undefined {
  return positions.find((position) => position.symbol === intent.symbol && position.side === intent.side);
}

function check(
  name: string,
  passed: boolean,
  severity: RiskCheck["severity"],
  message: string,
  value?: RiskCheck["value"],
  limit?: RiskCheck["limit"]
): RiskCheck {
  const result: RiskCheck = { name, passed, severity, message };
  if (value !== undefined) result.value = value;
  if (limit !== undefined) result.limit = limit;
  return result;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function isAlwaysOnMarket(symbol: string): boolean {
  return /\b(BTC|ETH|SOL|CRYPTO|PERP|USD[TC]?)\b/i.test(symbol);
}

function isUsRegularMarketOpen(date: Date): boolean {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const weekday = values.weekday ?? "";
  if (weekday === "Sat" || weekday === "Sun") return false;

  const hour = Number(values.hour ?? "0");
  const minute = Number(values.minute ?? "0");
  const minutes = hour * 60 + minute;
  return minutes >= 9 * 60 + 30 && minutes <= 16 * 60;
}
