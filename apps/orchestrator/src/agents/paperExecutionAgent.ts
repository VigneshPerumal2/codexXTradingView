import { applyPaperFill, createPaperFill, createPaperOrder, type AgentEvent, type MarketSnapshot, type RiskLimits, type RiskResult, type TradeIntent } from "@codex-tv/shared";
import type { TradingDatabase } from "../db/database.js";

export class PaperExecutionAgent {
  readonly name = "PaperExecutionAgent" as const;

  constructor(private readonly database: TradingDatabase, private readonly limits: RiskLimits) {}

  run(intent: TradeIntent, risk: RiskResult, snapshot: MarketSnapshot): void {
    const order = createPaperOrder(intent, risk);
    if (!risk.approved) {
      this.event("warning", "Paper order rejected by risk manager; no fill created.", { intentId: intent.id, reasons: risk.reasons });
      return;
    }

    const ledger = this.database.loadLedger();
    if (!ledger) throw new Error("Paper ledger is not initialized.");

    const fill = createPaperFill(order, intent, snapshot, this.limits);
    const nextLedger = applyPaperFill(ledger, intent, fill, snapshot.price);
    this.database.saveLedger(nextLedger);
    this.event("info", "Created simulated paper fill after risk approval.", {
      intentId: intent.id,
      fillId: fill.id,
      symbol: fill.symbol,
      quantity: fill.quantity,
      fillPrice: fill.fillPrice
    });
  }

  private event(level: AgentEvent["level"], message: string, metadata?: Record<string, unknown>): void {
    const event: AgentEvent = {
      id: `event_execution_${Date.now()}`,
      agent: this.name,
      level,
      message,
      createdAt: new Date().toISOString()
    };
    if (metadata) event.metadata = metadata;
    this.database.recordAgentEvent(event);
  }
}
