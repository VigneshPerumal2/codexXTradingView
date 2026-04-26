import { summarizePerformance, type AgentEvent } from "@codex-tv/shared";
import type { TradingDatabase } from "../db/database.js";

export class PerformanceAgent {
  readonly name = "PerformanceAgent" as const;

  constructor(private readonly database: TradingDatabase) {}

  run(): void {
    const ledger = this.database.loadLedger();
    if (!ledger) return;
    const metrics = summarizePerformance(ledger);
    this.database.recordAgentEvent({
      id: `event_performance_${Date.now()}`,
      agent: this.name,
      level: "info",
      message: "Updated hypothetical paper performance metrics.",
      createdAt: new Date().toISOString(),
      metadata: { ...metrics }
    } satisfies AgentEvent);
  }
}
