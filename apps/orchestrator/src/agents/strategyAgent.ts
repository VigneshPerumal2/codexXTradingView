import type { AgentEvent, MarketSnapshot, StrategyDecision, TradeIntent, TradingMode } from "@codex-tv/shared";
import type { TradingDatabase } from "../db/database.js";

export class StrategyAgent {
  readonly name = "StrategyAgent" as const;

  constructor(private readonly database: TradingDatabase, private readonly mode: TradingMode) {}

  run(snapshot: MarketSnapshot): StrategyDecision {
    const { score, confidence, reason } = scoreSnapshot(snapshot);
    const intent = score >= 0.6 ? this.createIntent(snapshot, confidence, reason) : undefined;
    const decision: StrategyDecision = {
      id: `decision_${snapshot.id}`,
      strategyId: "momentum-rsi-volume",
      snapshotId: snapshot.id,
      mode: this.mode,
      score,
      confidence,
      rationale: `${reason} Paper-only research signal; not a buy/sell instruction.`,
      createdAt: new Date().toISOString()
    };
    if (intent) decision.intent = intent;

    this.database.recordDecision(decision);
    this.event("info", intent ? "Strategy emitted a paper trade intent." : "Strategy recorded no-trade decision.", {
      snapshotId: snapshot.id,
      score,
      confidence,
      intentId: intent?.id
    });
    return decision;
  }

  private createIntent(snapshot: MarketSnapshot, confidence: number, reason: string): TradeIntent {
    const quantity = /BTC|ETH|SOL/i.test(snapshot.symbol) ? 0.01 : 1;
    return {
      id: `intent_${snapshot.id}`,
      timestamp: new Date().toISOString(),
      mode: this.mode,
      strategyId: "momentum-rsi-volume",
      symbol: snapshot.symbol,
      side: "long",
      action: "open",
      quantity,
      confidence,
      rationale: `${reason} This intent can only become a simulated paper fill.`,
      snapshotId: snapshot.id,
      expectedEntry: snapshot.price
    };
  }

  private event(level: AgentEvent["level"], message: string, metadata?: Record<string, unknown>): void {
    const event: AgentEvent = {
      id: `event_strategy_${Date.now()}`,
      agent: this.name,
      level,
      message,
      createdAt: new Date().toISOString()
    };
    if (metadata) event.metadata = metadata;
    this.database.recordAgentEvent(event);
  }
}

function scoreSnapshot(snapshot: MarketSnapshot): { score: number; confidence: number; reason: string } {
  const indicators = snapshot.indicators ?? {};
  const rsi = readNumber(indicators, ["rsi", "RSI", "relativeStrengthIndex"]);
  const volumeTrend = readString(indicators, ["volumeTrend", "volume_trend"]);

  if (rsi !== undefined) {
    if (rsi >= 45 && rsi <= 68) {
      return {
        score: volumeTrend === "rising" ? 0.72 : 0.64,
        confidence: volumeTrend === "rising" ? 0.64 : 0.56,
        reason: `RSI ${rsi.toFixed(1)} is in a continuation band${volumeTrend ? ` with ${volumeTrend} volume` : ""}.`
      };
    }
    if (rsi > 76) {
      return {
        score: 0.42,
        confidence: 0.4,
        reason: `RSI ${rsi.toFixed(1)} is extended; strategy will wait.`
      };
    }
  }

  return {
    score: 0.5,
    confidence: 0.35,
    reason: "Insufficient indicator confirmation from TradingView snapshot."
  };
}

function readNumber(input: Record<string, unknown>, keys: string[]): number | undefined {
  for (const key of keys) {
    const value = Number(input[key]);
    if (Number.isFinite(value)) return value;
  }
  return undefined;
}

function readString(input: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = input[key];
    if (typeof value === "string") return value;
  }
  return undefined;
}
