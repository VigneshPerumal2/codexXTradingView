import { evaluateRisk, type AgentEvent, type MarketSnapshot, type RiskLimits, type RiskResult, type TradeIntent } from "@codex-tv/shared";
import type { TradingDatabase } from "../db/database.js";

export class RiskManagerAgent {
  readonly name = "RiskManagerAgent" as const;

  constructor(private readonly database: TradingDatabase, private readonly limits: RiskLimits) {}

  run(intent: TradeIntent, snapshot: MarketSnapshot): RiskResult {
    const ledger = this.database.loadLedger();
    if (!ledger) throw new Error("Paper ledger is not initialized.");

    const result = evaluateRisk(intent, {
      now: new Date().toISOString(),
      snapshot,
      openPositions: ledger.positions,
      equity: ledger.equityCurve.at(-1)?.equity ?? ledger.startingCapital,
      dailyRealizedPnl: ledger.realizedPnl,
      duplicateIntentIds: new Set(ledger.seenIntentIds),
      limits: this.limits
    });

    this.database.recordRiskResult(result);
    this.event(result.approved ? "info" : "warning", result.approved ? "Risk approved paper intent." : "Risk blocked paper intent.", {
      intentId: intent.id,
      reasons: result.reasons
    });
    return result;
  }

  private event(level: AgentEvent["level"], message: string, metadata?: Record<string, unknown>): void {
    const event: AgentEvent = {
      id: `event_risk_${Date.now()}`,
      agent: this.name,
      level,
      message,
      createdAt: new Date().toISOString()
    };
    if (metadata) event.metadata = metadata;
    this.database.recordAgentEvent(event);
  }
}
